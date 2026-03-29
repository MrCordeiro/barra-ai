import { render, screen, fireEvent, waitFor } from '../../../jest/test-utils';
import LocalModelConfig from '../components/LocalModelConfig';
import { OllamaModelAvailability, OllamaStatus } from '../../content/ollama';
import { createMockStorage } from '../__mocks__/storage';
import { STORAGE_KEYS } from '../../storageKeys';

const mockStorage = createMockStorage();

/** Set what the background connection check will return. */
function mockCheck(status: OllamaModelAvailability) {
  (chrome.runtime.sendMessage as jest.Mock).mockResolvedValue(status);
}

async function renderLocalModelConfig() {
  render(<LocalModelConfig storage={mockStorage} />);
  await waitFor(() => {
    expect(chrome.runtime.sendMessage).toHaveBeenCalled();
  });
}

describe('<LocalModelConfig />', () => {
  beforeEach(() => {
    mockStorage.savedData = {};
    mockCheck({
      status: OllamaStatus.Connected,
      models: ['llama3.2:latest', 'mistral:latest'],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('renders with default endpoint and heading', async () => {
    await renderLocalModelConfig();

    expect(screen.getByText('Local Model Setup')).toBeInTheDocument();
    const endpointInput = screen.getByLabelText('Ollama endpoint');
    expect(endpointInput).toHaveValue('http://localhost:11434');
  });

  test('shows connected status after connection check succeeds', async () => {
    await renderLocalModelConfig();

    await waitFor(() => {
      expect(
        screen.getByText(/Connected — 2 models available/)
      ).toBeInTheDocument();
    });
  });

  test('shows not-running error when connection fails', async () => {
    mockCheck({ status: OllamaStatus.NotRunning });

    await renderLocalModelConfig();

    await waitFor(() => {
      expect(
        screen.getByText(/Can't reach Ollama at this address/)
      ).toBeInTheDocument();
    });
  });

  test('shows no-models message when Ollama is running but empty', async () => {
    mockCheck({ status: OllamaStatus.NoModels });

    await renderLocalModelConfig();

    await waitFor(() => {
      expect(
        screen.getByText(/Connected, but no models found/)
      ).toBeInTheDocument();
    });
  });

  test('shows model dropdown when connected', async () => {
    await renderLocalModelConfig();

    await waitFor(() => {
      expect(screen.getByLabelText('Local model')).toBeInTheDocument();
    });

    const select = screen.getByLabelText('Local model');
    expect(select).not.toBeDisabled();
  });

  test('model dropdown is disabled when not connected', async () => {
    mockCheck({ status: OllamaStatus.NotRunning });

    await renderLocalModelConfig();

    await waitFor(() => {
      expect(screen.getByLabelText('Local model')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Local model')).toBeDisabled();
  });

  test('shows text input for custom server instead of dropdown', async () => {
    mockCheck({ status: OllamaStatus.CustomServer });

    await renderLocalModelConfig();

    await waitFor(() => {
      expect(screen.getByLabelText('Model name')).toBeInTheDocument();
    });

    expect(screen.queryByLabelText('Local model')).not.toBeInTheDocument();
  });

  test('auto-selects model when only one is available', async () => {
    mockCheck({
      status: OllamaStatus.Connected,
      models: ['llama3.2:latest'],
    });

    await renderLocalModelConfig();

    await waitFor(() => {
      const select = screen.getByLabelText('Local model');
      expect((select as HTMLSelectElement).value).toBe('llama3.2:latest');
    });
  });

  test('shows :latest-stripped display name in dropdown options', async () => {
    await renderLocalModelConfig();

    await waitFor(() => {
      expect(screen.getByText('llama3.2')).toBeInTheDocument();
      expect(screen.getByText('mistral')).toBeInTheDocument();
    });
  });

  test('shows endpoint validation error on blur with invalid URL', async () => {
    await renderLocalModelConfig();

    const endpointInput = screen.getByLabelText('Ollama endpoint');
    fireEvent.change(endpointInput, { target: { value: 'not-a-url' } });
    fireEvent.blur(endpointInput);

    await waitFor(() => {
      expect(screen.getByText(/Must be a valid local URL/)).toBeInTheDocument();
    });
  });

  test('loads and normalizes saved endpoint from storage', async () => {
    mockStorage.savedData = {
      [STORAGE_KEYS.LOCAL_MODEL_ENDPOINT]: 'http://localhost:11434/v1',
      [STORAGE_KEYS.LOCAL_MODEL_CACHED]: 'mistral:latest',
    };

    await renderLocalModelConfig();

    await waitFor(() => {
      const endpointInput = screen.getByLabelText('Ollama endpoint');
      expect((endpointInput as HTMLInputElement).value).toBe(
        'http://localhost:11434'
      );
    });
  });

  test('normalizes endpoint to origin when saving on blur', async () => {
    await renderLocalModelConfig();

    const endpointInput = screen.getByLabelText('Ollama endpoint');
    fireEvent.change(endpointInput, {
      target: { value: 'http://127.0.0.1:11434/v1/' },
    });
    fireEvent.blur(endpointInput);

    await waitFor(() => {
      expect(mockStorage.savedData?.[STORAGE_KEYS.LOCAL_MODEL_ENDPOINT]).toBe(
        'http://127.0.0.1:11434'
      );
    });
  });

  test('persists auto-selected single model to storage', async () => {
    mockCheck({
      status: OllamaStatus.Connected,
      models: ['llama3.2:latest'],
    });

    await renderLocalModelConfig();

    await waitFor(() => {
      expect(mockStorage.savedData?.[STORAGE_KEYS.LOCAL_MODEL_CACHED]).toBe(
        'llama3.2:latest'
      );
    });
  });

  test('clears stale selected model from storage when unavailable', async () => {
    mockStorage.savedData = {
      [STORAGE_KEYS.LOCAL_MODEL_ENDPOINT]: 'http://localhost:11434',
      [STORAGE_KEYS.LOCAL_MODEL_CACHED]: 'stale:model',
    };
    mockCheck({
      status: OllamaStatus.Connected,
      models: ['llama3.2:latest', 'mistral:latest'],
    });

    await renderLocalModelConfig();

    await waitFor(() => {
      expect(mockStorage.savedData?.[STORAGE_KEYS.LOCAL_MODEL_CACHED]).toBe('');
    });
  });

  test('saves model to storage on selection', async () => {
    render(<LocalModelConfig storage={mockStorage} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Local model')).toBeInTheDocument();
    });

    const select = screen.getByLabelText('Local model');
    fireEvent.change(select, { target: { value: 'mistral:latest' } });

    await waitFor(() => {
      expect(mockStorage.savedData?.[STORAGE_KEYS.LOCAL_MODEL_CACHED]).toBe(
        'mistral:latest'
      );
    });
  });

  test('Check again button triggers connection check', async () => {
    mockCheck({ status: OllamaStatus.NotRunning });

    render(<LocalModelConfig storage={mockStorage} />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Check again/i })
      ).toBeInTheDocument();
    });

    mockCheck({
      status: OllamaStatus.Connected,
      models: ['llama3.2:latest'],
    });
    fireEvent.click(screen.getByRole('button', { name: /Check again/i }));

    await waitFor(() => {
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(2);
    });
  });

  test('routes connection check through background (sends ollama:check message)', async () => {
    await renderLocalModelConfig();

    await waitFor(() => {
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'ollama:check' })
      );
    });
  });
});
