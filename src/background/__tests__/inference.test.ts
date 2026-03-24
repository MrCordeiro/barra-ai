/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-var-requires */

describe('handleInferencePort', () => {
  const mockFetchAIResponse = jest.fn();

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

  function loadModule() {
    jest.doMock('../../content/ai', () => ({
      fetchAIResponse: mockFetchAIResponse,
    }));
    jest.doMock('../../storages', () => ({
      chromeStorage: {
        get: jest.fn().mockResolvedValue({
          localModelEnabled: 'false',
          localModelEndpoint: '',
        }),
      },
    }));
    return require('../inference') as {
      handleInferencePort: (port: chrome.runtime.Port) => void;
    };
  }

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

    const { handleInferencePort } = loadModule();
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

    const { handleInferencePort } = loadModule();
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

    const { handleInferencePort } = loadModule();
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

    const { handleInferencePort } = loadModule();
    const port = makePort();
    handleInferencePort(port as unknown as chrome.runtime.Port);
    port.trigger({ type: 'start', prompt: 'test' });

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(port.posted).toContainEqual(
      expect.objectContaining({ type: 'error', code: 'model_gone' })
    );
  });

  test('ignores messages that are not type "start"', async () => {
    const { handleInferencePort } = loadModule();
    const port = makePort();
    handleInferencePort(port as unknown as chrome.runtime.Port);
    port.trigger({ type: 'other', prompt: 'ignored' });

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockFetchAIResponse).not.toHaveBeenCalled();
    expect(port.posted).toHaveLength(0);
  });

  test('calls fetchAIResponse with the prompt from the message', async () => {
    mockFetchAIResponse.mockResolvedValue('ok');

    const { handleInferencePort } = loadModule();
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
  function loadModule(localModelEnabled: string, localModelEndpoint: string) {
    jest.doMock('../../storages', () => ({
      chromeStorage: {
        get: jest.fn().mockResolvedValue({
          localModelEnabled,
          localModelEndpoint,
        }),
        addChangeListener: jest.fn(),
      },
    }));
    jest.doMock('../../content/ai', () => ({
      fetchAIResponse: jest.fn(),
    }));
    return require('../inference') as {
      updateCorsRule: () => Promise<void>;
    };
  }

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    (
      chrome.declarativeNetRequest.updateDynamicRules as jest.Mock
    ).mockResolvedValue(undefined);
  });

  test('adds a declarativeNetRequest rule when local model is enabled', async () => {
    const { updateCorsRule } = loadModule('true', 'http://localhost:11434');
    await updateCorsRule();

    expect(
      chrome.declarativeNetRequest.updateDynamicRules
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        addRules: expect.arrayContaining([expect.objectContaining({ id: 1 })]),
        removeRuleIds: [1],
      })
    );
  });

  test('removes the rule when local model is disabled', async () => {
    const { updateCorsRule } = loadModule('false', 'http://localhost:11434');
    await updateCorsRule();

    expect(
      chrome.declarativeNetRequest.updateDynamicRules
    ).toHaveBeenCalledWith({ removeRuleIds: [1], addRules: [] });
  });
});
