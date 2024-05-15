'use strict';

// Content script file will run in the context of web page.
// With content script you can manipulate the web pages using
// Document Object Model (DOM).
// You can also pass information to the parent extension.

// We execute this script by making an entry in manifest.json file
// under `content_scripts` property

// For more information on Content Scripts,
// See https://developer.chrome.com/extensions/content_scripts

const API_KEY: string = process.env.OPENAI_API_KEY as string;

interface GPTResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

function parseAnswer(data: GPTResponse): string {
  const answer = data.choices[0].message.content;
  return answer;
}

function fetchGptResponse(prompt: string): Promise<string> {
  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo-0125',
      messages: [
        { role: 'system', content: 'You are a savvy social media expert.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 200,
    }),
  };

  return fetch('https://api.openai.com/v1/chat/completions', requestOptions)
    .then((response) => response.json())
    .then((data) => {
      console.log(data.choices);
      return data;
    })
    .then((data) => parseAnswer(data));
}

function handleKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Tab') {
    const textArea = document.activeElement! as HTMLTextAreaElement;

    // Extract all the text inside the p tags that may or may not exist,
    // withouth the p tags using regex groups
    const pTags = textArea.innerHTML.match(/<p>(.*?)<\/p>/g);
    const pTagText = pTags
      ? pTags.map((pTag) => pTag.replace(/<\/?p>/g, ''))
      : [];
    const value = pTagText.join(' ');

    const AI_COMMAND = '/ai';
    if (value && value.includes(AI_COMMAND)) {
      const prePrompt = 'Write a LinkedIn post about ';
      const postPrompt =
        '[Return only the main response. Write in an approcheable, yet witty manner.]';
      const prompt = `${prePrompt} ${value.replace('/ai', '')} ${postPrompt}`;

      fetchGptResponse(prompt).then((generatedText) => {
        textArea.innerHTML = generatedText;
        console.log(generatedText);
      });
    }
  }
}

document.addEventListener('keydown', handleKeyDown);
