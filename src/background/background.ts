'use strict';

import type { Browser } from 'wxt/browser';

import { triggerNotification, Priority } from './notifications';
import { handleInferencePort, updateCorsRule } from './inference';
import { checkOllamaConnection, OllamaStatus } from '../content/ollama';
import { extensionStorage } from '../storages';
import { MODEL_STORAGE_KEYS } from '../storageKeys';

interface ApiErrorRequest {
  type: 'API_ERROR';
  message: string;
}

interface OllamaCheckRequest {
  type: 'ollama:check';
  endpoint: string;
}

type BackgroundRequest = ApiErrorRequest | OllamaCheckRequest;

export function initializeBackground(): void {
  extensionStorage.addChangeListener(function syncCorsRulesOnChange(changes) {
    if (MODEL_STORAGE_KEYS.some(key => key in changes)) {
      void updateCorsRule();
    }
  });

  browser.runtime.onConnect.addListener(function setupInferenceHandler(
    port: Browser.runtime.Port
  ) {
    if (port.name === 'inference') handleInferencePort(port);
  });

  browser.runtime.onMessage.addListener(function handleBackgroundRequest(
    request: BackgroundRequest,
    _sender,
    sendResponse
  ) {
    if (request.type === 'API_ERROR') {
      triggerNotification(request.message, Priority.HIGH);
      sendResponse({ status: 'sent' });
    }

    if (request.type === 'ollama:check') {
      checkOllamaConnection(request.endpoint)
        .then(result => sendResponse(result))
        .catch(() => sendResponse({ status: OllamaStatus.NotRunning }));
      return true; // keep message channel open for async sendResponse
    }

    return false;
  });
}
