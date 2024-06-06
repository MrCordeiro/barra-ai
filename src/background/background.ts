import { triggerNotification, Priority } from './notifications';

interface Request {
  type: string;
  message: string;
}

chrome.runtime.onMessage.addListener(
  (request: Request, _sender, sendResponse) => {
    if (request.type === 'API_ERROR') {
      triggerNotification(request.message, Priority.HIGH);
      sendResponse({ status: 'sent' });
    }
  }
);
