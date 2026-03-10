/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { chromeStorage } from '../../storages';
import { fetchGptResponse } from '../openai';
import { makeStream } from '../../../jest/streamTestUtils';

function gptChunk(content: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content }, index: 0 }] })}`;
}

describe('fetchGptResponse', () => {
  beforeAll(() => {
    jest.spyOn(chromeStorage, 'get').mockImplementation(() => {
      return Promise.resolve({
        openaiApiKey: 'test-api-key',
      });
    });
  });

  test('should return the parsed GPT response', async () => {
    global.fetch = jest.fn().mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        body: makeStream([
          gptChunk('A LinkedIn post '),
          gptChunk('about AI'),
          'data: [DONE]',
        ]),
      })
    );

    const response = await fetchGptResponse(
      'Write a LinkedIn post about AI',
      'gpt-4o-mini',
      chromeStorage
    );

    expect(response).toBe('A LinkedIn post about AI');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining(
          JSON.stringify({
            role: 'system',
            content: 'You are a savvy writer.',
          })
        ),
      })
    );
  });

  test('should include stream: true in the request body', async () => {
    global.fetch = jest.fn().mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        body: makeStream(['data: [DONE]']),
      })
    );

    await fetchGptResponse('prompt', 'gpt-4o-mini', chromeStorage);

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
          gptChunk('Hello'),
          gptChunk(' world'),
          'data: [DONE]',
        ]),
      })
    );

    const chunks: string[] = [];
    await fetchGptResponse('prompt', 'gpt-4o-mini', chromeStorage, chunk =>
      chunks.push(chunk)
    );

    expect(chunks).toEqual(['Hello', ' world']);
  });

  test('should throw an error when the response is not ok', async () => {
    const prompt = 'Write a LinkedIn post about AI';
    const mockResponse = {
      error: {
        message: 'Test error',
        type: 'test',
        code: 'test',
      },
    };
    global.fetch = jest.fn().mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve(mockResponse),
      })
    );

    await expect(
      fetchGptResponse(prompt, 'gpt-4o-mini', chromeStorage)
    ).rejects.toThrow('Test error');
  });

  test('should throw when response body is null', async () => {
    global.fetch = jest
      .fn()
      .mockImplementationOnce(() => Promise.resolve({ ok: true, body: null }));

    await expect(
      fetchGptResponse('prompt', 'gpt-4o-mini', chromeStorage)
    ).rejects.toThrow('OpenAI response has no body');
  });
});
