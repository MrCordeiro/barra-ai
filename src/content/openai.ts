'use strict';

import { Storage, chromeStorage } from '../storages';

export const USE_MOCK: boolean =
  process.env.USE_MOCK && /^(?:y|yes|true|1)$/i.test(process.env.USE_MOCK)
    ? true
    : false;

interface GPTResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: {
    message: string;
    type: string;
    param: string | null;
    code: string;
  };
}

/**
 * Fetches the GPT response from the OpenAI API
 *
 * @param prompt The prompt to be used for the GPT response
 */
export async function fetchGptResponse(
  prompt: string,
  storage: Storage
): Promise<string> {
  const { apiKey, modelName } = await getSettings(storage);
  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: 'You are a savvy writer.' },
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
  const data = (await response.json()) as GPTResponse;
  if (!response.ok) {
    throw new Error(`Failed to connect to OpenAI. ${data.error!.message}`);
  }
  return parseAnswer(data);
}

async function getSettings(storage: Storage) {
  const storageData = await storage.get(['apiKey', 'modelName']);
  if (!storageData.apiKey || !storageData.modelName) {
    throw new Error(
      'API Key or Model Name is not set. Please go to the settings page to set them.'
    );
  }
  return storageData;
}

/**
 * Parses the GPT response to extract the answer
 *
 * @param data The GPT response data
 */
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

// eslint-disable-next-line @typescript-eslint/require-await
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
export async function fetchAIResponse(prompt: string): Promise<string> {
  if (USE_MOCK) {
    return fetchGptMockResponse();
  } else {
    /* istanbul ignore next */
    return fetchGptResponse(prompt, chromeStorage);
  }
}
