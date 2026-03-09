'use strict';

import { chromeStorage } from '../storages';
import { DEFAULT_LLM_MODEL, getProviderForModel } from '../models';
import { fetchGptResponse } from './openai';
import { fetchAnthropicResponse } from './anthropic';

export const USE_MOCK = /^(?:y|yes|true|1)$/i.test(process.env.USE_MOCK ?? '');

// eslint-disable-next-line @typescript-eslint/require-await
async function fetchAIMockResponse(): Promise<string> {
  return "🚀 Exciting news for all my fellow content creators and writers! \
  Just discovered an amazing extension that lets you effortlessly generate \
  GPT-powered texts with just a simple 'ai' command. Say goodbye to writer's \
  block and hello to endless possibilities! 📝💡 \
  #AI #ContentCreation #Innovation";
}

/**
 * Fetches an AI response, routing to the correct provider based on the stored model
 *
 * @param prompt The prompt to be sent
 */
export async function fetchAIResponse(
  prompt: string,
  onChunk?: (chunk: string) => void
): Promise<string> {
  if (USE_MOCK) {
    const response = await fetchAIMockResponse();
    onChunk?.(response);
    return response;
  }
  const { modelName } = await chromeStorage.get(['modelName']);
  const resolvedModel = modelName || DEFAULT_LLM_MODEL.value;
  if (getProviderForModel(resolvedModel) === 'anthropic') {
    return fetchAnthropicResponse(
      prompt,
      resolvedModel,
      chromeStorage,
      onChunk
    );
  }
  return fetchGptResponse(prompt, resolvedModel, chromeStorage, onChunk);
}
