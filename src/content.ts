'use strict';

import { fetchAIResponse } from './openai';
import { extractTextFromElement, setTextToElement } from './textExtractor';

// Content script file will run in the context of web page.
// With content script you can manipulate the web pages using
// Document Object Model (DOM).
// You can also pass information to the parent extension.

// We execute this script by making an entry in manifest.json file
// under `content_scripts` property

// For more information on Content Scripts,
// See https://developer.chrome.com/extensions/content_scripts

const AI_COMMAND = '/ai ';
function handleKeyDown(event: KeyboardEvent): void {
  if (event.key !== 'Tab') {
    return;
  }
  const activeElement = document.activeElement as HTMLElement;
  if (!activeElement || !isEditable(activeElement)) {
    return;
  }
  event.preventDefault();
  const value = extractTextFromElement(activeElement);

  if (value && value.startsWith(AI_COMMAND)) {
    const prePrompt = 'Write a LinkedIn post about ';
    const postPrompt =
      '[Return only the main response. Write in an approcheable, yet witty manner.]';
    const prompt = `${prePrompt} ${value.replace('/ai', '')} ${postPrompt}`;

    fetchAIResponse(prompt).then((generatedText) => {
      setTextToElement(generatedText, activeElement);
      console.log(generatedText);
    });
  }
}

function isEditable(element: HTMLElement): boolean {
  return (
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.isContentEditable
  );
}

document.addEventListener('keydown', handleKeyDown);
