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
    test(`should set USE_MOCK to ${expected} for env value ${envValue}`, async () => {
      process.env.USE_MOCK = envValue as string;

      jest.resetModules();
      const { USE_MOCK } = await import('../ai');
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

    const { fetchAIResponse } = await import('../ai');
    const response = await fetchAIResponse(prompt);

    expect(response).toBe(expectedResponse);
  });
});

describe('fetchAIResponse routing (USE_MOCK=false)', () => {
  const mockFetchGptResponse = jest.fn();
  const mockFetchAnthropicResponse = jest.fn();
  const mockFetchOllamaResponse = jest.fn();

  async function loadModule(
    modelName: string,
    localSettings?: {
      localModelEndpoint?: string;
      localModelCached?: string;
      openaiApiKey?: string;
      anthropicApiKey?: string;
      geminiApiKey?: string;
    }
  ): Promise<typeof import('../ai')> {
    jest.doMock('../../storages', () => ({
      chromeStorage: {
        get: jest.fn().mockResolvedValue({
          modelName,
          localModelEndpoint: localSettings?.localModelEndpoint ?? '',
          localModelCached: localSettings?.localModelCached ?? '',
          openaiApiKey: localSettings?.openaiApiKey ?? '',
          anthropicApiKey: localSettings?.anthropicApiKey ?? '',
          geminiApiKey: localSettings?.geminiApiKey ?? '',
        }),
      },
    }));
    jest.doMock('../openai', () => ({
      fetchGptResponse: mockFetchGptResponse,
    }));
    jest.doMock('../anthropic', () => ({
      fetchAnthropicResponse: mockFetchAnthropicResponse,
    }));
    jest.doMock('../ollama', () => ({
      fetchOllamaResponse: mockFetchOllamaResponse,
      DEFAULT_OLLAMA_ENDPOINT: 'http://localhost:11434',
    }));
    return import('../ai');
  }

  beforeEach(() => {
    process.env.USE_MOCK = 'false';
    jest.clearAllMocks();
    jest.resetModules();
    mockFetchGptResponse.mockReset();
    mockFetchAnthropicResponse.mockReset();
    mockFetchOllamaResponse.mockReset();
  });

  test('routes to OpenAI for a GPT model', async () => {
    mockFetchGptResponse.mockResolvedValue('gpt response');
    const { fetchAIResponse } = await loadModule('gpt-4o-mini', {
      openaiApiKey: 'sk-test',
    });
    const onChunk = jest.fn();

    await fetchAIResponse('test prompt', onChunk);

    expect(mockFetchGptResponse).toHaveBeenCalledWith(
      'test prompt',
      'gpt-4o-mini',
      expect.anything(),
      onChunk
    );
    expect(mockFetchAnthropicResponse).not.toHaveBeenCalled();
    expect(mockFetchOllamaResponse).not.toHaveBeenCalled();
  });

  test('routes to Anthropic for a Claude model', async () => {
    mockFetchAnthropicResponse.mockResolvedValue('claude response');
    const { fetchAIResponse } = await loadModule('claude-sonnet-4-6', {
      anthropicApiKey: 'ak-test',
    });
    const onChunk = jest.fn();

    await fetchAIResponse('test prompt', onChunk);

    expect(mockFetchAnthropicResponse).toHaveBeenCalledWith(
      'test prompt',
      'claude-sonnet-4-6',
      expect.anything(),
      onChunk
    );
    expect(mockFetchGptResponse).not.toHaveBeenCalled();
    expect(mockFetchOllamaResponse).not.toHaveBeenCalled();
  });

  test('falls back to OpenAI for an unknown model', async () => {
    mockFetchGptResponse.mockResolvedValue('gpt response');
    const { fetchAIResponse } = await loadModule('unknown-model', {
      openaiApiKey: 'sk-test',
    });
    const onChunk = jest.fn();

    await fetchAIResponse('test prompt', onChunk);

    expect(mockFetchGptResponse).toHaveBeenCalledWith(
      'test prompt',
      'unknown-model',
      expect.anything(),
      onChunk
    );
    expect(mockFetchAnthropicResponse).not.toHaveBeenCalled();
    expect(mockFetchOllamaResponse).not.toHaveBeenCalled();
  });

  test('routes to Ollama when selected model matches local model', async () => {
    mockFetchOllamaResponse.mockResolvedValue('ollama response');
    const { fetchAIResponse } = await loadModule('llama3.2:latest', {
      localModelEndpoint: 'http://localhost:11434',
      localModelCached: 'llama3.2:latest',
    });
    const onChunk = jest.fn();

    await fetchAIResponse('test prompt', onChunk);

    expect(mockFetchOllamaResponse).toHaveBeenCalledWith(
      'test prompt',
      'llama3.2:latest',
      'http://localhost:11434',
      onChunk
    );
    expect(mockFetchGptResponse).not.toHaveBeenCalled();
    expect(mockFetchAnthropicResponse).not.toHaveBeenCalled();
  });

  test('uses default Ollama endpoint when none is stored', async () => {
    mockFetchOllamaResponse.mockResolvedValue('ollama response');
    const { fetchAIResponse } = await loadModule('mistral:latest', {
      localModelEndpoint: '',
      localModelCached: 'mistral:latest',
    });

    await fetchAIResponse('test prompt');

    expect(mockFetchOllamaResponse).toHaveBeenCalledWith(
      'test prompt',
      'mistral:latest',
      'http://localhost:11434',
      undefined
    );
  });

  test('falls back to cloud route when local model is not selected', async () => {
    mockFetchGptResponse.mockResolvedValue('gpt response');
    const { fetchAIResponse } = await loadModule('gpt-4o', {
      openaiApiKey: 'sk-test',
      localModelEndpoint: 'http://localhost:11434',
      localModelCached: 'llama3.2:latest',
    });

    await fetchAIResponse('test prompt');

    expect(mockFetchGptResponse).toHaveBeenCalled();
    expect(mockFetchOllamaResponse).not.toHaveBeenCalled();
  });

  test('falls back to Ollama when cloud provider key is missing', async () => {
    mockFetchOllamaResponse.mockResolvedValue('ollama response');
    const { fetchAIResponse } = await loadModule('gpt-4o', {
      openaiApiKey: '',
      localModelEndpoint: 'http://localhost:11434',
      localModelCached: 'mistral:latest',
    });

    await fetchAIResponse('test prompt');

    expect(mockFetchOllamaResponse).toHaveBeenCalledWith(
      'test prompt',
      'mistral:latest',
      'http://localhost:11434',
      undefined
    );
    expect(mockFetchGptResponse).not.toHaveBeenCalled();
  });
});
