import { browser } from '../../browser';
import { triggerNotification } from '../notifications';

describe('Browser Notifications', () => {
  beforeEach(() => {
    (browser.notifications.create as jest.Mock).mockClear();
  });

  test('should trigger a notification with correct title and message', () => {
    const msg = 'Invalid API Key';
    triggerNotification(msg);

    expect(browser.notifications.create).toHaveBeenCalledWith({
      type: 'basic',
      iconUrl: 'icons/icon_128.png',
      title: 'Barra/AI',
      message: msg,
      priority: 0,
    });
  });
});
