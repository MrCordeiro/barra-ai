'use strict';

import { chromeStorage } from '../storages';
import { getProviderForModel } from '../models';
import { fetchGptResponse } from './openai';
import { fetchAnthropicResponse } from './anthropic';

export const USE_MOCK: boolean =
  process.env.USE_MOCK && /^(?:y|yes|true|1)$/i.test(process.env.USE_MOCK)
    ? true
    : false;

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
export async function fetchAIResponse(prompt: string): Promise<string> {
  if (USE_MOCK) {
    return fetchAIMockResponse();
  }
  const { modelName } = await chromeStorage.get(['modelName']);
  if (modelName && getProviderForModel(modelName as string) === 'anthropic') {
    return fetchAnthropicResponse(prompt, chromeStorage);
  }
  return fetchGptResponse(prompt, chromeStorage);
}
