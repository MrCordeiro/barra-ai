/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-var-requires */

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

      jest.resetModules();
      const { USE_MOCK } = require('../ai');
      expect(USE_MOCK).toBe(expected);
    });
  });
});

describe('fetchAIResponse with USE_MOCK=true', () => {
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

    const { fetchAIResponse } = require('../ai');
    const response = await fetchAIResponse(prompt);

    expect(response).toBe(expectedResponse);
  });
});

describe('fetchAIResponse routing (USE_MOCK=false)', () => {
  const mockFetchGptResponse = jest.fn();
  const mockFetchAnthropicResponse = jest.fn();

  function loadModule(modelName: string) {
    jest.doMock('../../storages', () => ({
      chromeStorage: {
        get: jest.fn().mockResolvedValue({ modelName }),
      },
    }));
    jest.doMock('../openai', () => ({
      fetchGptResponse: mockFetchGptResponse,
    }));
    jest.doMock('../anthropic', () => ({
      fetchAnthropicResponse: mockFetchAnthropicResponse,
    }));
    return require('../ai') as {
      fetchAIResponse: (p: string) => Promise<string>;
    };
  }

  beforeEach(() => {
    process.env.USE_MOCK = 'false';
    jest.resetModules();
    mockFetchGptResponse.mockReset();
    mockFetchAnthropicResponse.mockReset();
  });

  test('routes to OpenAI for a GPT model', async () => {
    mockFetchGptResponse.mockResolvedValue('gpt response');
    const { fetchAIResponse } = loadModule('gpt-4o-mini');

    await fetchAIResponse('test prompt');

    expect(mockFetchGptResponse).toHaveBeenCalledWith(
      'test prompt',
      expect.anything()
    );
    expect(mockFetchAnthropicResponse).not.toHaveBeenCalled();
  });

  test('routes to Anthropic for a Claude model', async () => {
    mockFetchAnthropicResponse.mockResolvedValue('claude response');
    const { fetchAIResponse } = loadModule('claude-sonnet-4-6');

    await fetchAIResponse('test prompt');

    expect(mockFetchAnthropicResponse).toHaveBeenCalledWith(
      'test prompt',
      expect.anything()
    );
    expect(mockFetchGptResponse).not.toHaveBeenCalled();
  });

  test('falls back to OpenAI for an unknown model', async () => {
    mockFetchGptResponse.mockResolvedValue('gpt response');
    const { fetchAIResponse } = loadModule('unknown-model');

    await fetchAIResponse('test prompt');

    expect(mockFetchGptResponse).toHaveBeenCalled();
    expect(mockFetchAnthropicResponse).not.toHaveBeenCalled();
  });
});
