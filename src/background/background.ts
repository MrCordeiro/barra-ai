'use strict';

import { triggerNotification, Priority } from './notifications';
import { handleInferencePort, updateCorsRule } from './inference';
import { checkOllamaConnection } from '../content/ollama';
import { chromeStorage } from '../storages';

interface ApiErrorRequest {
  type: 'API_ERROR';
  message: string;
}

interface OllamaCheckRequest {
  type: 'ollama:check';
  endpoint: string;
}

type BackgroundRequest = ApiErrorRequest | OllamaCheckRequest;

// Keep the declarativeNetRequest rule in sync whenever local model settings change.
chromeStorage.addChangeListener(changes => {
  if ('localModelEnabled' in changes || 'localModelEndpoint' in changes) {
    void updateCorsRule();
  }
});

// All streaming inference goes through this Port.
chrome.runtime.onConnect.addListener((port: chrome.runtime.Port) => {
  if (port.name === 'inference') {
    handleInferencePort(port);
  }
});

chrome.runtime.onMessage.addListener(
  (request: BackgroundRequest, _sender, sendResponse) => {
    if (request.type === 'API_ERROR') {
      triggerNotification(request.message, Priority.HIGH);
      sendResponse({ status: 'sent' });
    }

    if (request.type === 'ollama:check') {
      checkOllamaConnection(request.endpoint)
        .then(result => sendResponse(result))
        .catch(() => sendResponse({ type: 'not-running' }));
      return true; // keep message channel open for async sendResponse
    }
  }
);
