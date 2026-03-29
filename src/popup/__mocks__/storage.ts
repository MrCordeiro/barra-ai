import { Storage } from '../../storages';

/**
 * Creates a mock Storage implementation for testing.
 * Use in tests that need to verify storage interactions.
 */
export function createMockStorage(): Storage & {
  savedData?: Record<string, string>;
} {
  const mockStorage: Storage & { savedData?: Record<string, string> } = {
    savedData: {},
    get: keys => {
      return new Promise(resolve => {
        const data = mockStorage.savedData ?? {};
        if (!keys) return resolve(data);
        const result: Record<string, string> = {};
        (Array.isArray(keys) ? keys : [keys]).forEach(key => {
          if (key in data) result[key] = data[key];
        });
        resolve(result);
      });
    },
    set: items => {
      return new Promise(resolve => {
        mockStorage.savedData = { ...(mockStorage.savedData ?? {}), ...items };
        resolve();
      });
    },
    addChangeListener: jest.fn(),
    removeChangeListener: jest.fn(),
  };

  return mockStorage;
}
