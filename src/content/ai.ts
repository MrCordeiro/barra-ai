'use strict';

import { chromeStorage, Storage } from '../storages';
import { DEFAULT_LLM_MODEL, getProviderForModel, Provider } from '../models';
import { fetchGptResponse } from './openai';
import { fetchAnthropicResponse } from './anthropic';
import { fetchGeminiResponse } from './gemini';
import { fetchOllamaResponse, DEFAULT_OLLAMA_ENDPOINT } from './ollama';

export const USE_MOCK = /^(?:y|yes|true|1)$/i.test(process.env.USE_MOCK ?? '');

// eslint-disable-next-line @typescript-eslint/require-await
async function fetchAIMockResponse(): Promise<string> {
  return "🚀 Exciting news for all my fellow content creators and writers! \
  Just discovered an amazing extension that lets you effortlessly generate \
  GPT-powered texts with just a simple 'ai' command. Say goodbye to writer's \
  block and hello to endless possibilities! 📝💡 \
  #AI #ContentCreation #Innovation";
}

type ProviderFetch = (
  prompt: string,
  modelName: string,
  storage: Storage,
  onChunk?: (chunk: string) => void
) => Promise<string>;

const providerHandlers: Record<Provider, ProviderFetch> = {
  openai: fetchGptResponse,
  anthropic: fetchAnthropicResponse,
  gemini: fetchGeminiResponse,
};

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

  const stored = await chromeStorage.get([
    'modelName',
    'localModelEnabled',
    'localModelEndpoint',
    'localModelName',
  ]);

  if (stored.localModelEnabled === 'true') {
    const endpoint = stored.localModelEndpoint || DEFAULT_OLLAMA_ENDPOINT;
    if (!stored.localModelName) {
      throw new Error(
        'No local model selected. Please open settings and choose a model.'
      );
    }
    return fetchOllamaResponse(
      prompt,
      stored.localModelName,
      endpoint,
      onChunk
    );
  }

  const resolvedModel = stored.modelName || DEFAULT_LLM_MODEL.value;
  const provider = getProviderForModel(resolvedModel);
  return providerHandlers[provider](
    prompt,
    resolvedModel,
    chromeStorage,
    onChunk
  );
}
