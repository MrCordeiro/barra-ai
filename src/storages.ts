/**
 * Represents a storage interface.
 */
export interface Storage {
  /**
   * Retrieves values associated with the specified keys.
   * @param keys - An array of keys.
   * @returns A promise that resolves to an object containing key-value pairs.
   */
  get: (keys: string | string[] | null) => Promise<Record<string, string>>;

  /**
   * Sets the values for the specified keys.
   * @param items - An object containing key-value pairs.
   * @returns A promise that resolves when the operation is complete.
   */
  set: (items: Record<string, string>) => Promise<void>;
}

/* istanbul ignore next */
export const chromeStorage = {
  get: (keys: string | string[] | null = null) =>
    chrome.storage.local.get(keys),
  set: (items: Record<string, string>) => chrome.storage.local.set(items),
};
