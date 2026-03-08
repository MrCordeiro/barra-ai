import '@testing-library/jest-dom';

// jsdom does not expose Node.js stream globals; make them available for SSE tests
import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream } from 'stream/web';
Object.assign(global, { TextEncoder, TextDecoder, ReadableStream });
