import { parseSSEStream } from '../sseParser';
import { makeStream } from '../../../jest/streamTestUtils';

describe('parseSSEStream', () => {
  test('extracts text from data lines and returns accumulated result', async () => {
    const stream = makeStream(['data: hello', 'data:  world', 'data: [DONE]']);
    const result = await parseSSEStream(stream, raw => {
      if (raw.trim() === '[DONE]') return '';
      return raw;
    });
    expect(result).toBe('hello world');
  });

  test('skips non-data lines', async () => {
    const stream = makeStream([
      'event: content_block_delta',
      'data: text',
      '',
      'event: message_stop',
      'data: stop',
    ]);
    const calls: string[] = [];
    await parseSSEStream(stream, raw => {
      calls.push(raw);
      return raw;
    });
    expect(calls).toEqual(['text', 'stop']);
  });

  test('handles partial chunks split across reads', async () => {
    const encoder = new TextEncoder();
    const fullLine = 'data: hello\n';
    const part1 = fullLine.slice(0, 7);
    const part2 = fullLine.slice(7);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(part1));
        controller.enqueue(encoder.encode(part2));
        controller.close();
      },
    });
    const result = await parseSSEStream(stream, raw => raw);
    expect(result).toBe('hello');
  });

  test('returns empty string when extractText always returns empty', async () => {
    const stream = makeStream(['data: ignored']);
    const result = await parseSSEStream(stream, () => '');
    expect(result).toBe('');
  });

  test('handles CRLF line endings', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: hello\r\ndata: world\r\n'));
        controller.close();
      },
    });
    const result = await parseSSEStream(stream, raw => raw);
    expect(result).toBe('helloworld');
  });

  test('accepts data: without space after colon', async () => {
    const stream = makeStream(['data:hello', 'data: world']);
    const result = await parseSSEStream(stream, raw => raw);
    expect(result).toBe('helloworld');
  });
});
