'use strict';

import { Storage, chromeStorage } from '../storages';
import { extractErrorMessage } from './providerError';
import { parseSSEStream } from './sseParser';
import { STORAGE_KEYS } from '../storageKeys';

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
    const message = await extractErrorMessage(response);
    throw new Error(`Failed to connect to Anthropic. ${message}`);
  }

  if (!response.body) throw new Error('Anthropic response has no body');
  return parseSSEStream(response.body, raw => {
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
  const { [STORAGE_KEYS.ANTHROPIC_API_KEY]: anthropicApiKey } =
    await storage.get([STORAGE_KEYS.ANTHROPIC_API_KEY]);
  if (!anthropicApiKey) {
    throw new Error(
      'Anthropic API Key is not set. Please go to the settings page to set it.'
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
