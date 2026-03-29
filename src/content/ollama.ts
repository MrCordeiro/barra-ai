'use strict';

import { extractErrorMessage } from './providerError';
import { parseSSEStream } from './sseParser';

export const DEFAULT_OLLAMA_ENDPOINT = 'http://localhost:11434';

interface OllamaTagsResponse {
  models: { name: string; size: number }[];
}

interface OllamaStreamChunk {
  choices: { delta: { content?: string }; index: number }[];
}

export enum OllamaStatus {
  Connected = 'connected',
  NotRunning = 'not-running',
  NoModels = 'no-models',
  CustomServer = 'custom-server',
}

export type OllamaModelAvailability =
  | { status: OllamaStatus.Connected; models: string[] }
  | { status: OllamaStatus.NotRunning }
  | { status: OllamaStatus.NoModels }
  | { status: OllamaStatus.CustomServer };

/**
 * Strips the ":latest" suffix from an Ollama model name for display purposes.
 * The full name (with suffix) should still be used when sending API requests.
 */
export function normalizeModelDisplay(name: string): string {
  return name.replace(/:latest$/, '');
}

function makeTimeoutSignal(ms: number): AbortSignal | undefined {
  // AbortSignal.timeout is available in modern browsers and Node 17+,
  // but may be absent in test environments (jsdom).
  if (typeof AbortSignal?.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  return undefined;
}

/**
 * Checks if an Ollama (or compatible) server is running at the given endpoint.
 *
 * First tries GET /api/tags (Ollama-native). If that fails, falls back to a
 * lightweight POST /v1/chat/completions probe to detect non-Ollama
 * OpenAI-compatible servers
 */
export async function checkOllamaConnection(
  endpoint: string
): Promise<OllamaModelAvailability> {
  try {
    const response = await fetch(`${endpoint}/api/tags`, {
      signal: makeTimeoutSignal(3000),
    });
    if (response.ok) {
      const data = (await response.json()) as OllamaTagsResponse;
      const models = data.models.map(m => m.name);
      if (models.length === 0) {
        return { status: OllamaStatus.NoModels };
      }
      return { status: OllamaStatus.Connected, models };
    }
  } catch {
    // /api/tags failed — try the OpenAI-compatible probe below
  }

  // fallback: probe /v1/chat/completions
  try {
    const response = await fetch(`${endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'test',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
      }),
      signal: makeTimeoutSignal(3000),
    });
    // Any response (even 4xx) means the server is there and OpenAI-compatible
    if (response.ok || response.status < 500) {
      return { status: OllamaStatus.CustomServer };
    }
  } catch {
    // Both probes failed
  }

  return { status: OllamaStatus.NotRunning };
}

/**
 * Sends a streaming chat completion request to a local Ollama or
 * OpenAI-compatible endpoint. No Authorization header is sent.
 */
export async function fetchOllamaResponse(
  prompt: string,
  modelName: string,
  endpoint: string,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const response = await fetch(`${endpoint}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new Error(`Failed to connect to local model. ${message}`);
  }

  if (!response.body) throw new Error('Ollama response has no body');

  return parseSSEStream(response.body, raw => {
    if (raw.trim() === '[DONE]') return '';
    const chunk = JSON.parse(raw) as OllamaStreamChunk;
    const text = chunk.choices[0]?.delta?.content ?? '';
    if (text) onChunk?.(text);
    return text;
  });
}
