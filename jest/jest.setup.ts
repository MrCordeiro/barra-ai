import '@testing-library/jest-dom';

// jsdom does not expose Node.js stream globals; make them available for SSE tests
import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream } from 'stream/web';
const g = global as Record<string, unknown>;
g.TextEncoder ??= TextEncoder;
g.TextDecoder ??= TextDecoder;
g.ReadableStream ??= ReadableStream;

// The WebExtension API stub lives in ./wxtBrowserMock.ts, which `package.json`
// maps `wxt/browser` to. Importing it here guarantees the stub exists before
// any module under test resolves `browser` from src/browser.ts.
import './wxtBrowserMock';
