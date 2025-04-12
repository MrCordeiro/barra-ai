'use strict';
// Content script file will run in the context of web page.
// With content script you can manipulate the web pages using
// Document Object Model (DOM).
// You can also pass information to the parent extension.

// We execute this script by making an entry in manifest.json file
// under `content_scripts` property

// For more information on Content Scripts,
// See https://developer.chrome.com/extensions/content_scripts
import { fetchAIResponse } from './openai';
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

  const prompt = createPrompt(text);

  fetchAIResponse(prompt)
    .then(response => {
      element.setText(response);
      console.log(response);
    })
    .catch((error: Error) => {
      chrome.runtime
        .sendMessage({
          type: 'API_ERROR',
          message: error.message,
        })
        .catch(error =>
          console.error('Error sending message to background:', error)
        );
    });
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
