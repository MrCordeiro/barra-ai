import { chromeStorage } from '../../storages';
import { fetchGeminiResponse } from '../gemini';
import { makeStream } from '../../../jest/streamTestUtils';

function geminiChunk(text: string): string {
  return `data: ${JSON.stringify({
    candidates: [{ content: { parts: [{ text }], role: 'model' } }],
  })}`;
}

describe('fetchGeminiResponse', () => {
  beforeAll(() => {
    jest.spyOn(chromeStorage, 'get').mockImplementation(() => {
      return Promise.resolve({
        geminiApiKey: 'test-gemini-key',
      });
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('should return the parsed Gemini response', async () => {
    global.fetch = jest.fn().mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        body: makeStream([
          geminiChunk('A LinkedIn post '),
          geminiChunk('about AI'),
        ]),
      })
    );

    const response = await fetchGeminiResponse(
      'Write a LinkedIn post about AI',
      'gemini-2.0-flash',
      chromeStorage
    );

    expect(response).toBe('A LinkedIn post about AI');
    const calls = (global.fetch as jest.Mock).mock.calls as [
      string,
      { headers: Record<string, string>; body: string },
    ][];
    expect(calls[0][0]).toContain('gemini-2.0-flash:streamGenerateContent');
    expect(calls[0][0]).toContain('alt=sse');
    expect(calls[0][0]).not.toContain('key=');
    expect(calls[0][1].headers['x-goog-api-key']).toBe('test-gemini-key');
  });

  test('should include correct request body with contents and generationConfig', async () => {
    global.fetch = jest.fn().mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        body: makeStream([geminiChunk('hello')]),
      })
    );

    await fetchGeminiResponse('prompt', 'gemini-2.0-flash', chromeStorage);

    const calls = (global.fetch as jest.Mock).mock.calls as [
      string,
      { body: string },
    ][];
    const body = JSON.parse(calls[0][1].body) as Record<string, unknown>;
    expect(body.contents).toEqual([
      { role: 'user', parts: [{ text: 'prompt' }] },
    ]);
    expect(body.generationConfig).toEqual({ maxOutputTokens: 200 });
  });

  test('should call onChunk for each text part', async () => {
    global.fetch = jest.fn().mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        body: makeStream([geminiChunk('Hello'), geminiChunk(' world')]),
      })
    );

    const chunks: string[] = [];
    await fetchGeminiResponse(
      'prompt',
      'gemini-2.0-flash',
      chromeStorage,
      chunk => chunks.push(chunk)
    );

    expect(chunks).toEqual(['Hello', ' world']);
  });

  test('should throw an error when the response is not ok', async () => {
    const mockResponse = {
      error: {
        code: 400,
        message: 'Invalid API key',
        status: 'INVALID_ARGUMENT',
      },
    };
    global.fetch = jest.fn().mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve(mockResponse),
      })
    );

    await expect(
      fetchGeminiResponse('prompt', 'gemini-2.0-flash', chromeStorage)
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
      fetchGeminiResponse('prompt', 'gemini-2.0-flash', chromeStorage)
    ).rejects.toThrow('Service Unavailable');
  });

  test('should throw when geminiApiKey is missing from storage', async () => {
    jest
      .spyOn(chromeStorage, 'get')
      .mockImplementationOnce(() => Promise.resolve({}));

    await expect(
      fetchGeminiResponse('prompt', 'gemini-2.0-flash', chromeStorage)
    ).rejects.toThrow(
      'Gemini API Key is not set. Please go to the settings page to set them.'
    );
  });

  test('should throw when response body is null', async () => {
    global.fetch = jest
      .fn()
      .mockImplementationOnce(() => Promise.resolve({ ok: true, body: null }));

    await expect(
      fetchGeminiResponse('prompt', 'gemini-2.0-flash', chromeStorage)
    ).rejects.toThrow('Gemini response has no body');
  });

  test('should skip chunks without text', async () => {
    global.fetch = jest.fn().mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        body: makeStream([
          `data: ${JSON.stringify({ candidates: [{ finishReason: 'STOP' }] })}`,
          geminiChunk('only text'),
        ]),
      })
    );

    const response = await fetchGeminiResponse(
      'prompt',
      'gemini-2.0-flash',
      chromeStorage
    );
    expect(response).toBe('only text');
  });
});
