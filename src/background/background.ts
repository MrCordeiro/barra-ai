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

chromeStorage.addChangeListener(function syncCorsRulesOnChange(changes) {
  if (
    'modelName' in changes ||
    'localModelName' in changes ||
    'localModelEndpoint' in changes
  ) {
    void updateCorsRule();
  }
});

chrome.runtime.onConnect.addListener(function setupInferenceHandler(
  port: chrome.runtime.Port
) {
  if (port.name === 'inference') handleInferencePort(port);
});

chrome.runtime.onMessage.addListener(function handleBackgroundRequest(
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
      .catch(() => sendResponse({ type: 'not-running' }));
    return true; // keep message channel open for async sendResponse
  }
});
