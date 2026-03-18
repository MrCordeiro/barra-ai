'use strict';

import { Storage, chromeStorage } from '../storages';
import { parseSSEStream } from './sseParser';

interface GeminiErrorResponse {
  error?: { code: number; message: string; status: string };
}

interface GeminiStreamChunk {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
}

/**
 * Fetches a response from the Google Gemini API using SSE streaming
 *
 * @param prompt The prompt to be sent
 * @param modelName The model to use
 * @param storage Storage instance for reading credentials
 * @param onChunk Called with each text chunk as it arrives
 */
export async function fetchGeminiResponse(
  prompt: string,
  modelName: string,
  storage: Storage,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const { geminiApiKey } = await getSettings(storage);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${geminiApiKey}`;
  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 200 },
      systemInstruction: { parts: [{ text: 'You are a savvy writer.' }] },
    }),
  };

  const response = await fetch(url, requestOptions);
  if (!response.ok) {
    const data = (await response.json()) as GeminiErrorResponse;
    throw new Error(`Failed to connect to Gemini. ${data.error!.message}`);
  }

  if (!response.body) throw new Error('Gemini response has no body');
  return parseSSEStream(response.body, raw => {
    const chunk = JSON.parse(raw) as GeminiStreamChunk;
    const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (text) onChunk?.(text);
    return text;
  });
}

async function getSettings(storage: Storage) {
  const { geminiApiKey } = await storage.get(['geminiApiKey']);
  if (!geminiApiKey) {
    throw new Error(
      'API Key or Model Name is not set. Please go to the settings page to set them.'
    );
  }
  return { geminiApiKey };
}

/* istanbul ignore next */
export async function fetchGeminiAIResponse(
  prompt: string,
  modelName: string
): Promise<string> {
  return fetchGeminiResponse(prompt, modelName, chromeStorage);
}
