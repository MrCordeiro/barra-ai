/**
 * Minimal WebExtension API stub for unit tests.
 *
 * `package.json` maps `wxt/browser` to this module, so `src/browser.ts` — and
 * therefore every module that imports `browser` from it — resolves here under
 * Jest. Individual tests override specific methods with `jest.fn()` /
 * `jest.spyOn()`.
 *
 * The stub is cached on `globalThis` so that `jest.resetModules()` (used by
 * `inference.test.ts` and `ai.test.ts`) hands the re-imported code the *same*
 * mock instance the test is holding a reference to.
 */
function createBrowserMock() {
  return {
    runtime: {
      sendMessage: jest.fn().mockResolvedValue({ type: 'not-running' }),
      connect: jest.fn(),
      onConnect: { addListener: jest.fn() },
      onMessage: { addListener: jest.fn() },
    },
    storage: {
      local: {
        get: jest.fn().mockResolvedValue({}),
        set: jest.fn().mockResolvedValue(undefined),
      },
      onChanged: {
        addListener: jest.fn(),
        removeListener: jest.fn(),
      },
    },
    declarativeNetRequest: {
      updateDynamicRules: jest.fn().mockResolvedValue(undefined),
    },
    notifications: {
      create: jest.fn().mockResolvedValue('notification-id'),
    },
  };
}

type BrowserMock = ReturnType<typeof createBrowserMock>;

const globalWithMock = globalThis as typeof globalThis & {
  __wxtBrowserMock__?: BrowserMock;
};

globalWithMock.__wxtBrowserMock__ ??= createBrowserMock();

export const browser = globalWithMock.__wxtBrowserMock__;
