/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-var-requires */
import { fetchGptResponse } from '../openai';

describe('Environment Variable USE_MOCK', () => {
  const testCases = [
    { envValue: '1', expected: true },
    { envValue: '0', expected: false },
    { envValue: 'true', expected: true },
    { envValue: 'false', expected: false },
    { envValue: true, expected: true },
    { envValue: false, expected: false },
    { envValue: undefined, expected: false },
  ];

  testCases.forEach(({ envValue, expected }) => {
    test(`should set USE_MOCK to ${expected} for env value ${envValue}`, () => {
      process.env.USE_MOCK = envValue as string;

      // Reset module registry to re-import with new env variable
      jest.resetModules();
      const { USE_MOCK: USE_MOCK } = require('../openai');
      expect(USE_MOCK).toBe(expected);
    });
  });
});

describe('fetchAIResponse', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.USE_MOCK = 'true';
  });

  test('should return a mock response when USE_MOCK is true', async () => {
    const prompt = 'Write a LinkedIn post about AI';
    const expectedResponse =
      "🚀 Exciting news for all my fellow content creators and writers! \
  Just discovered an amazing extension that lets you effortlessly generate \
  GPT-powered texts with just a simple 'ai' command. Say goodbye to writer's \
  block and hello to endless possibilities! 📝💡 \
  #AI #ContentCreation #Innovation";

    const { fetchAIResponse } = require('../openai');
    const response = await fetchAIResponse(prompt);

    expect(response).toBe(expectedResponse);
  });
});

describe('fetchGptResponse', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.USE_MOCK = 'false';
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

    const response = await fetchGptResponse(prompt);

    expect(response).toBe(mockResponse.choices[0].message.content);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining(
          JSON.stringify({
            role: 'system',
            content: 'You are a savvy social media expert.',
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

    await expect(fetchGptResponse(prompt)).rejects.toThrow('Test error');
  });
});

describe('fetchAIResponse', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.USE_MOCK = 'true';
  });

  test('should return a mock response when USE_MOCK is true', async () => {
    const prompt = 'Write a LinkedIn post about AI';
    const expectedResponse =
      "🚀 Exciting news for all my fellow content creators and writers! \
  Just discovered an amazing extension that lets you effortlessly generate \
  GPT-powered texts with just a simple 'ai' command. Say goodbye to writer's \
  block and hello to endless possibilities! 📝💡 \
  #AI #ContentCreation #Innovation";

    const { fetchAIResponse } = require('../openai');
    const response = await fetchAIResponse(prompt);

    expect(response).toBe(expectedResponse);
  });
});
