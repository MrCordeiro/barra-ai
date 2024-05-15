'use strict';

// Content script file will run in the context of web page.
// With content script you can manipulate the web pages using
// Document Object Model (DOM).
// You can also pass information to the parent extension.

// We execute this script by making an entry in manifest.json file
// under `content_scripts` property

// For more information on Content Scripts,
// See https://developer.chrome.com/extensions/content_scripts

const AI_COMMAND = '/ai ';
const API_KEY: string = process.env.OPENAI_API_KEY as string;
export const USE_MOCK: boolean =
  process.env.USE_MOCK && /^(?:y|yes|true|1)$/i.test(process.env.USE_MOCK)
    ? true
    : false;

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

/**
 * A dummy function to mock the fetchGptResponse function without making an
 * actual API call
 *
 * @param prompt The prompt to be used for the mock response
 */
async function fetchGptMockResponse(): Promise<string> {
  return "🚀 Exciting news for all my fellow content creators and writers! \
  Just discovered an amazing extension that lets you effortlessly generate \
  GPT-powered texts with just a simple 'ai' command. Say goodbye to writer's \
  block and hello to endless possibilities! 📝💡 \
  #AI #ContentCreation #Innovation";
}

/**
 * Fetches the GPT response from the OpenAI API
 *
 * @param prompt The prompt to be used for the GPT response
 */
async function fetchGptResponse(prompt: string): Promise<string> {
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

  const response = await fetch(
    'https://api.openai.com/v1/chat/completions',
    requestOptions
  );
  const data = await response.json();
  const data_1 = data;
  return parseAnswer(data_1);
}

export async function fetchAIResponse(prompt: string): Promise<string> {
  if (USE_MOCK) {
    return fetchGptMockResponse();
  } else {
    return fetchGptResponse(prompt);
  }
}

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
