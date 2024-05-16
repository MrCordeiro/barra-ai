'use strict';

import { fetchAIResponse } from './openai';

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
  if (event.key === 'Tab') {
    const textArea = document.activeElement! as HTMLTextAreaElement;

    // Extract all the text inside the p tags that may or may not exist,
    // without the p tags using regex groups
    const pTags = textArea.innerHTML.match(/<p>(.*?)<\/p>/g);
    const pTagText = pTags
      ? pTags.map((pTag) => pTag.replace(/<\/?p>/g, ''))
      : [];
    const value = pTagText.join(' ');

    if (value && value.startsWith(AI_COMMAND)) {
      const prePrompt = 'Write a LinkedIn post about ';
      const postPrompt =
        '[Return only the main response. Write in an approcheable, yet witty manner.]';
      const prompt = `${prePrompt} ${value.replace('/ai', '')} ${postPrompt}`;

      fetchAIResponse(prompt).then((generatedText) => {
        textArea.innerHTML = generatedText;
        console.log(generatedText);
      });
    }
  }
}

document.addEventListener('keydown', handleKeyDown);
