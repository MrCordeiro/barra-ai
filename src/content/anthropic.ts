'use strict';

import { Storage, chromeStorage } from '../storages';
import { parseSSEStream } from './sseParser';

interface AnthropicErrorResponse {
  error?: { type: string; message: string };
}

interface AnthropicStreamChunk {
  type: string;
  delta?: { type: string; text: string };
}

/**
 * Fetches a response from the Anthropic Messages API
 *
 * @param prompt The prompt to be sent
 * @param modelName The model to use
 * @param storage Storage instance for reading credentials
 * @param onChunk Called with each text chunk as it arrives
 */
export async function fetchAnthropicResponse(
  prompt: string,
  modelName: string,
  storage: Storage,
  onChunk?: (chunk: string) => void
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
      stream: true,
    }),
  };

  const response = await fetch(
    'https://api.anthropic.com/v1/messages',
    requestOptions
  );
  if (!response.ok) {
    const data = (await response.json()) as AnthropicErrorResponse;
    throw new Error(`Failed to connect to Anthropic. ${data.error!.message}`);
  }

  return parseSSEStream(response.body!, raw => {
    const chunk = JSON.parse(raw) as AnthropicStreamChunk;
    if (
      chunk.type !== 'content_block_delta' ||
      chunk.delta?.type !== 'text_delta'
    )
      return '';
    const text = chunk.delta.text;
    if (text) onChunk?.(text);
    return text;
  });
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
