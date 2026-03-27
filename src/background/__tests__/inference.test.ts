function makePort(onMessageCallback?: (msg: unknown) => void) {
  const listeners: ((msg: unknown) => void)[] = [];
  const posted: unknown[] = [];

  const port = {
    name: 'inference',
    onMessage: {
      addListener: jest.fn((fn: (msg: unknown) => void) => {
        listeners.push(fn);
        if (onMessageCallback) onMessageCallback(fn);
      }),
    },
    postMessage: jest.fn((msg: unknown) => {
      posted.push(msg);
    }),
    disconnect: jest.fn(),
    posted,
    trigger: (msg: unknown) => listeners.forEach(fn => fn(msg)),
  };
  return port;
}

type InferenceModule = typeof import('../inference');

interface InferenceStorageValues {
  modelName: string;
  localModelName: string;
  localModelEndpoint: string;
}

async function loadInferenceModule(options: {
  storageValues: InferenceStorageValues;
  fetchAIResponseMock?: jest.Mock;
}): Promise<InferenceModule> {
  jest.doMock('../../content/ai', () => ({
    fetchAIResponse: options.fetchAIResponseMock ?? jest.fn(),
  }));
  jest.doMock('../../storages', () => ({
    chromeStorage: {
      get: jest.fn().mockResolvedValue(options.storageValues),
      addChangeListener: jest.fn(),
    },
  }));
  return import('../inference');
}

describe('handleInferencePort', () => {
  const mockFetchAIResponse = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockFetchAIResponse.mockReset();
    (
      chrome.declarativeNetRequest.updateDynamicRules as jest.Mock
    ).mockResolvedValue(undefined);
  });

  test('posts chunk messages for each chunk received', async () => {
    mockFetchAIResponse.mockImplementation(
      (_prompt: string, onChunk: (c: string) => void) => {
        onChunk('Hello');
        onChunk(' world');
        return Promise.resolve('Hello world');
      }
    );

    const { handleInferencePort } = await loadInferenceModule({
      fetchAIResponseMock: mockFetchAIResponse,
      storageValues: {
        modelName: 'gpt-4o-mini',
        localModelName: 'llama3.2:latest',
        localModelEndpoint: '',
      },
    });
    const port = makePort();
    handleInferencePort(port as unknown as chrome.runtime.Port);
    port.trigger({ type: 'start', prompt: 'test prompt' });

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(port.posted).toContainEqual({ type: 'chunk', content: 'Hello' });
    expect(port.posted).toContainEqual({ type: 'chunk', content: ' world' });
    expect(port.posted).toContainEqual({ type: 'done' });
  });

  test('posts done message on successful completion', async () => {
    mockFetchAIResponse.mockResolvedValue('response text');

    const { handleInferencePort } = await loadInferenceModule({
      fetchAIResponseMock: mockFetchAIResponse,
      storageValues: {
        modelName: 'gpt-4o-mini',
        localModelName: 'llama3.2:latest',
        localModelEndpoint: '',
      },
    });
    const port = makePort();
    handleInferencePort(port as unknown as chrome.runtime.Port);
    port.trigger({ type: 'start', prompt: 'test' });

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(port.posted).toContainEqual({ type: 'done' });
    expect(port.posted).not.toContainEqual(
      expect.objectContaining({ type: 'error' })
    );
  });

  test('posts error message when fetchAIResponse throws', async () => {
    mockFetchAIResponse.mockRejectedValue(new Error('API error'));

    const { handleInferencePort } = await loadInferenceModule({
      fetchAIResponseMock: mockFetchAIResponse,
      storageValues: {
        modelName: 'gpt-4o-mini',
        localModelName: 'llama3.2:latest',
        localModelEndpoint: '',
      },
    });
    const port = makePort();
    handleInferencePort(port as unknown as chrome.runtime.Port);
    port.trigger({ type: 'start', prompt: 'test' });

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(port.posted).toContainEqual(
      expect.objectContaining({ type: 'error', message: 'API error' })
    );
    expect(port.posted).not.toContainEqual({ type: 'done' });
  });

  test('categorizes missing model error as model_gone', async () => {
    mockFetchAIResponse.mockRejectedValue(
      new Error('No local model selected. Please open settings.')
    );

    const { handleInferencePort } = await loadInferenceModule({
      fetchAIResponseMock: mockFetchAIResponse,
      storageValues: {
        modelName: 'gpt-4o-mini',
        localModelName: 'llama3.2:latest',
        localModelEndpoint: '',
      },
    });
    const port = makePort();
    handleInferencePort(port as unknown as chrome.runtime.Port);
    port.trigger({ type: 'start', prompt: 'test' });

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(port.posted).toContainEqual(
      expect.objectContaining({ type: 'error', code: 'model_gone' })
    );
  });

  test('categorizes network errors as unreachable', async () => {
    mockFetchAIResponse.mockRejectedValue(new Error('Failed to fetch'));

    const { handleInferencePort } = await loadInferenceModule({
      fetchAIResponseMock: mockFetchAIResponse,
      storageValues: {
        modelName: 'gpt-4o-mini',
        localModelName: 'llama3.2:latest',
        localModelEndpoint: '',
      },
    });
    const port = makePort();
    handleInferencePort(port as unknown as chrome.runtime.Port);
    port.trigger({ type: 'start', prompt: 'test' });

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(port.posted).toContainEqual(
      expect.objectContaining({ type: 'error', code: 'unreachable' })
    );
  });

  test('ignores messages that are not type "start"', async () => {
    const { handleInferencePort } = await loadInferenceModule({
      fetchAIResponseMock: mockFetchAIResponse,
      storageValues: {
        modelName: 'gpt-4o-mini',
        localModelName: 'llama3.2:latest',
        localModelEndpoint: '',
      },
    });
    const port = makePort();
    handleInferencePort(port as unknown as chrome.runtime.Port);
    port.trigger({ type: 'other', prompt: 'ignored' });

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockFetchAIResponse).not.toHaveBeenCalled();
    expect(port.posted).toHaveLength(0);
  });

  test('calls fetchAIResponse with the prompt from the message', async () => {
    mockFetchAIResponse.mockResolvedValue('ok');

    const { handleInferencePort } = await loadInferenceModule({
      fetchAIResponseMock: mockFetchAIResponse,
      storageValues: {
        modelName: 'gpt-4o-mini',
        localModelName: 'llama3.2:latest',
        localModelEndpoint: '',
      },
    });
    const port = makePort();
    handleInferencePort(port as unknown as chrome.runtime.Port);
    port.trigger({ type: 'start', prompt: 'write a tweet' });

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockFetchAIResponse).toHaveBeenCalledWith(
      'write a tweet',
      expect.any(Function)
    );
  });
});

describe('updateCorsRule', () => {
  function expectedCorsRule(origin: string) {
    return {
      id: 1,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          {
            header: 'Origin',
            operation: 'set',
            value: origin,
          },
        ],
      },
      condition: {
        urlFilter: `${origin}/*`,
        resourceTypes: ['xmlhttprequest'],
      },
    };
  }

  function expectCorsRuleApplied(origin: string) {
    expect(
      chrome.declarativeNetRequest.updateDynamicRules
    ).toHaveBeenCalledWith({
      removeRuleIds: [1],
      addRules: [expectedCorsRule(origin)],
    });
  }

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    const updateDynamicRulesMock = chrome.declarativeNetRequest
      .updateDynamicRules as jest.MockedFunction<
      typeof chrome.declarativeNetRequest.updateDynamicRules
    >;
    updateDynamicRulesMock.mockResolvedValue(undefined);
  });

  test('adds a declarativeNetRequest rule when local model is selected', async () => {
    const { updateCorsRule } = await loadInferenceModule({
      storageValues: {
        modelName: 'llama3.2:latest',
        localModelName: 'llama3.2:latest',
        localModelEndpoint: 'http://localhost:11434',
      },
    });
    await updateCorsRule();

    expectCorsRuleApplied('http://localhost:11434');
  });

  test('normalizes endpoint path to origin in rule values', async () => {
    const { updateCorsRule } = await loadInferenceModule({
      storageValues: {
        modelName: 'llama3.2:latest',
        localModelName: 'llama3.2:latest',
        localModelEndpoint: 'http://localhost:11434/v1/',
      },
    });
    await updateCorsRule();

    expectCorsRuleApplied('http://localhost:11434');
  });

  test('removes the rule when local model is not selected', async () => {
    const { updateCorsRule } = await loadInferenceModule({
      storageValues: {
        modelName: 'gpt-4o-mini',
        localModelName: 'llama3.2:latest',
        localModelEndpoint: 'http://localhost:11434',
      },
    });
    await updateCorsRule();

    expect(
      chrome.declarativeNetRequest.updateDynamicRules
    ).toHaveBeenCalledWith({ removeRuleIds: [1], addRules: [] });
  });
});
