/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { chromeStorage } from '../../storages';
import { fetchAnthropicResponse } from '../anthropic';

describe('fetchAnthropicResponse', () => {
  beforeAll(() => {
    jest.spyOn(chromeStorage, 'get').mockImplementation(() => {
      return Promise.resolve({
        anthropicApiKey: 'test-anthropic-key',
        modelName: 'claude-sonnet-4-6',
      });
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('should return the parsed Anthropic response', async () => {
    const prompt = 'Write a LinkedIn post about AI';
    const mockResponse = {
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'A LinkedIn post about AI' }],
      model: 'claude-sonnet-4-6',
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 20 },
    };
    global.fetch = jest.fn().mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })
    );

    const response = await fetchAnthropicResponse(prompt, chromeStorage);

    expect(response).toBe(mockResponse.content[0].text);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'test-anthropic-key',
          'anthropic-version': '2023-06-01',
        }),
        body: expect.stringContaining(
          JSON.stringify({ role: 'user', content: prompt })
        ),
      })
    );
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

    await expect(fetchAnthropicResponse(prompt, chromeStorage)).rejects.toThrow(
      'Invalid API key'
    );
  });

  test('should throw when anthropicApiKey is missing from storage', async () => {
    jest
      .spyOn(chromeStorage, 'get')
      .mockImplementationOnce(() =>
        Promise.resolve({ modelName: 'claude-sonnet-4-6' })
      );

    await expect(
      fetchAnthropicResponse('prompt', chromeStorage)
    ).rejects.toThrow('API Key or Model Name is not set');
  });
});
