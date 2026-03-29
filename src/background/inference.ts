'use strict';

import { fetchAIResponse } from '../content/ai';
import { chromeStorage } from '../storages';
import { DEFAULT_OLLAMA_ENDPOINT } from '../content/ollama';
import { MODEL_STORAGE_KEYS, STORAGE_KEYS as SK } from '../storageKeys';

export interface ChunkMessage {
  type: 'chunk';
  content: string;
}

export interface DoneMessage {
  type: 'done';
}

export interface ErrorMessage {
  type: 'error';
  code: 'model_gone' | 'unreachable' | 'cors' | 'unknown';
  message: string;
}

export type OutboundPortMessage = ChunkMessage | DoneMessage | ErrorMessage;

interface StartMessage {
  type: 'start';
  prompt: string;
}

function normalizeEndpointOrigin(endpoint: string): string {
  try {
    return new URL(endpoint).origin;
  } catch {
    return DEFAULT_OLLAMA_ENDPOINT;
  }
}

function categorizeError(error: unknown): ErrorMessage['code'] {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  if (msg.includes('No local model selected')) return 'model_gone';
  if (lower.includes('cors')) return 'cors';
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network error') ||
    lower.includes('net::err_internet_disconnected') ||
    lower.includes('net::err_name_not_resolved') ||
    lower.includes('net::err_connection_refused') ||
    lower.includes('net::err_connection_timed_out')
  ) {
    return 'unreachable';
  }
  return 'unknown';
}

/**
 * Handles an "inference" Port connection from a content script.
 * Waits for a { type: "start", prompt } message, runs the AI request
 * (routing is handled by fetchAIResponse in ai.ts), and streams chunks
 * back over the port.
 */
export function handleInferencePort(port: chrome.runtime.Port): void {
  port.onMessage.addListener((msg: StartMessage) => {
    if (msg.type !== 'start') return;
    void runInference(port, msg.prompt);
  });
}

async function runInference(
  port: chrome.runtime.Port,
  prompt: string
): Promise<void> {
  // Ensure the declarativeNetRequest CORS rule is current before fetching.
  await updateCorsRule();

  const send = (msg: OutboundPortMessage) => {
    try {
      port.postMessage(msg);
    } catch {
      // Port may have been disconnected (user navigated / tab closed).
    }
  };

  try {
    await fetchAIResponse(prompt, chunk => {
      send({ type: 'chunk', content: chunk });
    });
    send({ type: 'done' });
  } catch (error) {
    send({
      type: 'error',
      code: categorizeError(error),
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Keeps the declarativeNetRequest Origin-rewrite rule in sync with the
 * current local-model configuration (Layer 2 CORS defence).
 *
 * Rule id 1 is reserved for this purpose. It is added when local mode is
 * active and removed when it is not.
 */
export async function updateCorsRule(): Promise<void> {
  const stored = await chromeStorage.get([...MODEL_STORAGE_KEYS]);
  const enabled =
    !!stored[SK.LOCAL_MODEL_CACHED] &&
    stored[SK.MODEL_NAME] === stored[SK.LOCAL_MODEL_CACHED];
  const endpoint = normalizeEndpointOrigin(
    stored[SK.LOCAL_MODEL_ENDPOINT] || DEFAULT_OLLAMA_ENDPOINT
  );

  if (enabled) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1],
      addRules: [
        {
          id: 1,
          priority: 1,
          action: {
            type: 'modifyHeaders' as chrome.declarativeNetRequest.RuleActionType,
            requestHeaders: [
              {
                header: 'Origin',
                operation:
                  'set' as chrome.declarativeNetRequest.HeaderOperation,
                value: endpoint,
              },
            ],
          },
          condition: {
            urlFilter: `${endpoint}/*`,
            resourceTypes: [
              'xmlhttprequest' as chrome.declarativeNetRequest.ResourceType,
            ],
          },
        },
      ],
    });
  } else {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1],
      addRules: [],
    });
  }
}
