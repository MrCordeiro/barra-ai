import '@testing-library/jest-dom';

// jsdom does not expose Node.js stream globals; make them available for SSE tests
import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream } from 'stream/web';
const g = global as Record<string, unknown>;
if (!g.TextEncoder) g.TextEncoder = TextEncoder;
if (!g.TextDecoder) g.TextDecoder = TextDecoder;
if (!g.ReadableStream) g.ReadableStream = ReadableStream;

// Minimal Chrome extension API stub for popup/background unit tests.
// Individual tests can override specific methods with jest.fn() / jest.spyOn().
g.chrome = {
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
};
