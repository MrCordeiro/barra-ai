import {
  checkOllamaConnection,
  fetchOllamaResponse,
  normalizeModelDisplay,
  DEFAULT_OLLAMA_ENDPOINT,
} from '../ollama';
import { makeStream } from '../../../jest/streamTestUtils';

function ollamaChunk(content: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content }, index: 0 }] })}`;
}

describe('normalizeModelDisplay', () => {
  test('strips :latest suffix', () => {
    expect(normalizeModelDisplay('llama3.2:latest')).toBe('llama3.2');
  });

  test('keeps non-latest tags', () => {
    expect(normalizeModelDisplay('codellama:13b')).toBe('codellama:13b');
  });

  test('leaves names without tag unchanged', () => {
    expect(normalizeModelDisplay('mistral')).toBe('mistral');
  });
});

describe('checkOllamaConnection', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns connected with model list when /api/tags succeeds', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          models: [
            { name: 'llama3.2:latest', size: 1000 },
            { name: 'mistral:latest', size: 2000 },
          ],
        }),
    });

    const status = await checkOllamaConnection(DEFAULT_OLLAMA_ENDPOINT);

    expect(status).toEqual({
      type: 'connected',
      models: ['llama3.2:latest', 'mistral:latest'],
    });
    expect(global.fetch).toHaveBeenCalledWith(
      `${DEFAULT_OLLAMA_ENDPOINT}/api/tags`,
      expect.anything()
    );
  });

  test('returns no-models when /api/tags returns empty list', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ models: [] }),
    });

    const status = await checkOllamaConnection(DEFAULT_OLLAMA_ENDPOINT);
    expect(status).toEqual({ type: 'no-models' });
  });

  test('returns custom-server when /api/tags fails but /v1/chat/completions responds', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('connection refused'))
      .mockResolvedValueOnce({ ok: true });

    const status = await checkOllamaConnection('http://localhost:1234');
    expect(status).toEqual({ type: 'custom-server' });
  });

  test('returns not-running when both probes fail', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('connection refused'))
      .mockRejectedValueOnce(new Error('connection refused'));

    const status = await checkOllamaConnection(DEFAULT_OLLAMA_ENDPOINT);
    expect(status).toEqual({ type: 'not-running' });
  });

  test('returns not-running when /api/tags returns non-ok and /v1/chat/completions fails with 500', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ ok: false, status: 500 });

    const status = await checkOllamaConnection(DEFAULT_OLLAMA_ENDPOINT);
    expect(status).toEqual({ type: 'not-running' });
  });

  test('returns custom-server on 4xx from /v1/chat/completions fallback', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('no /api/tags'))
      .mockResolvedValueOnce({ ok: false, status: 400 });

    const status = await checkOllamaConnection('http://localhost:1234');
    expect(status).toEqual({ type: 'custom-server' });
  });
});

describe('fetchOllamaResponse', () => {
  const endpoint = DEFAULT_OLLAMA_ENDPOINT;

  test('returns accumulated streamed text', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      body: makeStream([
        ollamaChunk('Hello '),
        ollamaChunk('world'),
        'data: [DONE]',
      ]),
    });

    const response = await fetchOllamaResponse(
      'Write something',
      'llama3.2:latest',
      endpoint
    );

    expect(response).toBe('Hello world');
    expect(global.fetch).toHaveBeenCalledWith(
      `${endpoint}/v1/chat/completions`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  test('does not include Authorization header', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      body: makeStream(['data: [DONE]']),
    });

    await fetchOllamaResponse('prompt', 'llama3.2', endpoint);

    const calls = (global.fetch as jest.Mock).mock.calls as [
      string,
      { headers: Record<string, string> },
    ][];
    expect(calls[0][1].headers).not.toHaveProperty('Authorization');
  });

  test('sends stream: true in request body', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      body: makeStream(['data: [DONE]']),
    });

    await fetchOllamaResponse('prompt', 'llama3.2', endpoint);

    const calls = (global.fetch as jest.Mock).mock.calls as [
      string,
      { body: string },
    ][];
    const body = JSON.parse(calls[0][1].body) as Record<string, unknown>;
    expect(body.stream).toBe(true);
    expect(body.model).toBe('llama3.2');
  });

  test('calls onChunk for each text delta', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      body: makeStream([
        ollamaChunk('chunk1'),
        ollamaChunk('chunk2'),
        'data: [DONE]',
      ]),
    });

    const chunks: string[] = [];
    await fetchOllamaResponse('prompt', 'llama3.2', endpoint, chunk =>
      chunks.push(chunk)
    );

    expect(chunks).toEqual(['chunk1', 'chunk2']);
  });

  test('throws on non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: { message: 'model not found' } }),
    });

    await expect(
      fetchOllamaResponse('prompt', 'bad-model', endpoint)
    ).rejects.toThrow('model not found');
  });

  test('throws when response body is null', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, body: null });

    await expect(
      fetchOllamaResponse('prompt', 'llama3.2', endpoint)
    ).rejects.toThrow('Ollama response has no body');
  });

  test('uses the provided custom endpoint', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      body: makeStream(['data: [DONE]']),
    });

    await fetchOllamaResponse('prompt', 'llama3.2', 'http://192.168.1.5:11434');

    const calls = (global.fetch as jest.Mock).mock.calls as [string, unknown][];
    expect(calls[0][0]).toBe('http://192.168.1.5:11434/v1/chat/completions');
  });
});
