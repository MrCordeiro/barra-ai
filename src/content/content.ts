'use strict';
// Content script file will run in the context of web page.
// With content script you can manipulate the web pages using
// Document Object Model (DOM).
// You can also pass information to the parent extension.

// We execute this script by making an entry in manifest.json file
// under `content_scripts` property

// For more information on Content Scripts,
// See https://developer.chrome.com/extensions/content_scripts
import { getEditableElement } from './editableElements';

const AI_COMMAND = '/ai ';

function handleKeyDown(event: KeyboardEvent): void {
  const activationCmd = event.key === 'Tab';
  if (!activationCmd) return;

  const activeElement = document.activeElement as HTMLElement;
  if (!activeElement) return;

  const element = getEditableElement(activeElement);
  if (!element) return;

  const text = element.extractText();
  if (!text?.startsWith(AI_COMMAND)) return;

  // Keep focus and selection stable while the streaming replacement starts.
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  const prompt = createPrompt(text);
  let accumulatedText = '';

  // All inference goes through the background service worker via a Port.
  // The background worker reads storage to decide which provider to use,
  // so the content script never needs to know which provider is active.
  const port = chrome.runtime.connect({ name: 'inference' });

  port.onMessage.addListener(
    (msg: { type: string; content?: string; message?: string }) => {
      if (msg.type === 'chunk' && msg.content) {
        accumulatedText += msg.content;
        element.setText(accumulatedText);
      }
      if (msg.type === 'done') {
        port.disconnect();
      }
      if (msg.type === 'error') {
        port.disconnect();
        chrome.runtime
          .sendMessage({
            type: 'API_ERROR',
            message: msg.message ?? 'Unknown error',
          })
          .catch(error =>
            console.error('Error sending message to background:', error)
          );
      }
    }
  );

  port.postMessage({ type: 'start', prompt });
}

function createPrompt(text: string) {
  const prePrompt =
    '[You are a witty and clever assistant. Be concise unless otherwise specified.] ';
  const postPrompt =
    '[Return only the main response. Write in an approcheable, yet witty manner.]';
  const prompt = `${prePrompt} ${text.replace(AI_COMMAND, '')} ${postPrompt}`;
  return prompt;
}

document.addEventListener('keydown', handleKeyDown, true);
