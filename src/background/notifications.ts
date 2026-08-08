import { browser } from '../browser';

/**
 * The priority of the notification.
 * @enum {number}
 * @readonly
 */
export enum Priority {
  DEFAULT = 0,
  HIGH = 1,
  MAX = 2,
}

/**
 * Triggers a browser notification with the given title and message.
 * @param message - The message body of the notification.
 * @param priority - The priority of the notification. Defaults to `Priority.DEFAULT`.
 */
export function triggerNotification(
  message: string,
  priority: Priority = Priority.DEFAULT
): void {
  // istanbul ignore next
  if (!browser.notifications) {
    console.error('Notifications API not available');
    return;
  }

  void browser.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon_128.png',
    title: 'Barra/AI',
    message,
    priority,
  });
}
