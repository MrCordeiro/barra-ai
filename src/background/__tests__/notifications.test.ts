import { triggerNotification } from '../notifications';

describe('Browser Notifications', () => {
  beforeAll(() => {
    global.browser = {
      // @ts-expect-error This is a mock implementation
      notifications: {
        create: jest.fn(),
      },
    };
    global.chrome = global.browser;
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
