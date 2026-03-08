/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { chromeStorage } from '../../storages';
import { fetchGptResponse } from '../openai';

describe('fetchGptResponse', () => {
  beforeAll(() => {
    jest.spyOn(chromeStorage, 'get').mockImplementation(() => {
      return Promise.resolve({
        openaiApiKey: 'test-api-key',
      });
    });
  });

  test('should return the parsed GPT response', async () => {
    const prompt = 'Write a LinkedIn post about AI';
    const mockResponse = {
      id: 'test-id',
      object: 'text.completion',
      created: 1234567890,
      model: 'gpt-3.5-turbo-0125',
      choices: [
        {
          index: 0,
          message: {
            role: 'user',
            content: 'A LinkedIn post about AI',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
    global.fetch = jest.fn().mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })
    );

    const response = await fetchGptResponse(
      prompt,
      'gpt-4o-mini',
      chromeStorage
    );

    expect(response).toBe(mockResponse.choices[0].message.content);
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
});
