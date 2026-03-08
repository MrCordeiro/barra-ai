'use strict';

import { Storage, chromeStorage } from '../storages';
import { parseSSEStream } from './sseParser';

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

interface GPTStreamChunk {
  choices: { delta: { content?: string }; index: number }[];
}

/**
 * Fetches the GPT response from the OpenAI API
 *
 * @param prompt The prompt to be used for the GPT response
 * @param modelName The model to use
 * @param storage Storage instance for reading credentials
 * @param onChunk Called with each text chunk as it arrives
 */
export async function fetchGptResponse(
  prompt: string,
  modelName: string,
  storage: Storage,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const { openaiApiKey } = await getSettings(storage);
  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: 'You are a savvy writer.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 200,
      stream: true,
    }),
  };

  const response = await fetch(
    'https://api.openai.com/v1/chat/completions',
    requestOptions
  );
  if (!response.ok) {
    const data = (await response.json()) as GPTResponse;
    throw new Error(`Failed to connect to OpenAI. ${data.error!.message}`);
  }

  return parseSSEStream(response.body!, raw => {
    if (raw.trim() === '[DONE]') return '';
    const chunk = JSON.parse(raw) as GPTStreamChunk;
    const text = chunk.choices[0]?.delta?.content ?? '';
    if (text) onChunk?.(text);
    return text;
  });
}

async function getSettings(storage: Storage) {
  const { openaiApiKey } = await storage.get(['openaiApiKey']);
  if (!openaiApiKey) {
    throw new Error(
      'API Key or Model Name is not set. Please go to the settings page to set them.'
    );
  }
  return { openaiApiKey };
}

/* istanbul ignore next */
export async function fetchOpenAIResponse(
  prompt: string,
  modelName: string
): Promise<string> {
  return fetchGptResponse(prompt, modelName, chromeStorage);
}
