'use strict';

import { Storage, chromeStorage } from '../storages';

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: { type: string; text: string }[];
  model: string;
  stop_reason: string;
  usage: { input_tokens: number; output_tokens: number };
  error?: { type: string; message: string };
}

/**
 * Fetches a response from the Anthropic Messages API
 *
 * @param prompt The prompt to be sent
 * @param modelName The model to use
 * @param storage Storage instance for reading credentials
 */
export async function fetchAnthropicResponse(
  prompt: string,
  modelName: string,
  storage: Storage
): Promise<string> {
  const { anthropicApiKey } = await getSettings(storage);
  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: modelName,
      max_tokens: 200,
      system: 'You are a savvy writer.',
      messages: [{ role: 'user', content: prompt }],
    }),
  };

  const response = await fetch(
    'https://api.anthropic.com/v1/messages',
    requestOptions
  );
  const data = (await response.json()) as AnthropicResponse;
  if (!response.ok) {
    throw new Error(`Failed to connect to Anthropic. ${data.error!.message}`);
  }
  return data.content[0].text;
}

async function getSettings(storage: Storage) {
  const { anthropicApiKey } = await storage.get(['anthropicApiKey']);
  if (!anthropicApiKey) {
    throw new Error(
      'API Key or Model Name is not set. Please go to the settings page to set them.'
    );
  }
  return { anthropicApiKey };
}

/* istanbul ignore next */
export async function fetchAnthropicAIResponse(
  prompt: string,
  modelName: string
): Promise<string> {
  return fetchAnthropicResponse(prompt, modelName, chromeStorage);
}
