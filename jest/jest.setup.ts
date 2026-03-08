import '@testing-library/jest-dom';

// jsdom does not expose Node.js stream globals; make them available for SSE tests
import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream } from 'stream/web';
const g = global as Record<string, unknown>;
if (!g.TextEncoder) g.TextEncoder = TextEncoder;
if (!g.TextDecoder) g.TextDecoder = TextDecoder;
if (!g.ReadableStream) g.ReadableStream = ReadableStream;
