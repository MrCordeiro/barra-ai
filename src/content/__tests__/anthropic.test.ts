/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { chromeStorage } from '../../storages';
import { fetchAnthropicResponse } from '../anthropic';
import { makeStream } from '../../../jest/streamTestUtils';

function anthropicChunk(text: string): string {
  return `data: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text } })}`;
}

describe('fetchAnthropicResponse', () => {
  beforeAll(() => {
    jest.spyOn(chromeStorage, 'get').mockImplementation(() => {
      return Promise.resolve({
        anthropicApiKey: 'test-anthropic-key',
      });
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('should return the parsed Anthropic response', async () => {
    global.fetch = jest.fn().mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        body: makeStream([
          anthropicChunk('A LinkedIn post '),
          anthropicChunk('about AI'),
          `data: ${JSON.stringify({ type: 'message_stop' })}`,
        ]),
      })
    );

    const response = await fetchAnthropicResponse(
      'Write a LinkedIn post about AI',
      'claude-sonnet-4-6',
      chromeStorage
    );

    expect(response).toBe('A LinkedIn post about AI');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'test-anthropic-key',
          'anthropic-version': '2023-06-01',
        }),
        body: expect.stringContaining(
          JSON.stringify({
            role: 'user',
            content: 'Write a LinkedIn post about AI',
          })
        ),
      })
    );
  });

  test('should include stream: true in the request body', async () => {
    global.fetch = jest.fn().mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        body: makeStream([`data: ${JSON.stringify({ type: 'message_stop' })}`]),
      })
    );

    await fetchAnthropicResponse('prompt', 'claude-sonnet-4-6', chromeStorage);

    const calls = (global.fetch as jest.Mock).mock.calls as [
      string,
      { body: string },
    ][];
    const body = JSON.parse(calls[0][1].body) as Record<string, unknown>;
    expect(body.stream).toBe(true);
  });

  test('should call onChunk for each text delta', async () => {
    global.fetch = jest.fn().mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        body: makeStream([
          anthropicChunk('Hello'),
          anthropicChunk(' world'),
          `data: ${JSON.stringify({ type: 'message_stop' })}`,
        ]),
      })
    );

    const chunks: string[] = [];
    await fetchAnthropicResponse(
      'prompt',
      'claude-sonnet-4-6',
      chromeStorage,
      chunk => chunks.push(chunk)
    );

    expect(chunks).toEqual(['Hello', ' world']);
  });

  test('should throw an error when the response is not ok', async () => {
    const prompt = 'Write a LinkedIn post about AI';
    const mockResponse = {
      error: { type: 'authentication_error', message: 'Invalid API key' },
    };
    global.fetch = jest.fn().mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve(mockResponse),
      })
    );

    await expect(
      fetchAnthropicResponse(prompt, 'claude-sonnet-4-6', chromeStorage)
    ).rejects.toThrow('Invalid API key');
  });

  test('should fall back to statusText when error body is not JSON', async () => {
    global.fetch = jest.fn().mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        statusText: 'Service Unavailable',
        json: () => Promise.reject(new Error('not json')),
      })
    );

    await expect(
      fetchAnthropicResponse('prompt', 'claude-sonnet-4-6', chromeStorage)
    ).rejects.toThrow('Service Unavailable');
  });

  test('should throw when anthropicApiKey is missing from storage', async () => {
    jest
      .spyOn(chromeStorage, 'get')
      .mockImplementationOnce(() => Promise.resolve({}));

    await expect(
      fetchAnthropicResponse('prompt', 'claude-sonnet-4-6', chromeStorage)
    ).rejects.toThrow('Anthropic API Key is not set');
  });

  test('should throw when response body is null', async () => {
    global.fetch = jest
      .fn()
      .mockImplementationOnce(() => Promise.resolve({ ok: true, body: null }));

    await expect(
      fetchAnthropicResponse('prompt', 'claude-sonnet-4-6', chromeStorage)
    ).rejects.toThrow('Anthropic response has no body');
  });
});
