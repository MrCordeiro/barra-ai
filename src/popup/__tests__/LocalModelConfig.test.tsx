import { render, screen, fireEvent, waitFor } from '../../../jest/test-utils';
import { Storage } from '../../storages';
import LocalModelConfig from '../components/LocalModelConfig';
import { OllamaConnectionStatus } from '../../content/ollama';

const mockStorage: Storage & { savedData?: Record<string, string> } = {
  savedData: {},
  get: keys => {
    return new Promise(resolve => {
      const data = mockStorage.savedData ?? {};
      if (!keys) return resolve(data);
      const result: Record<string, string> = {};
      (Array.isArray(keys) ? keys : [keys]).forEach(key => {
        if (key in data) result[key] = data[key];
      });
      resolve(result);
    });
  },
  set: items => {
    return new Promise(resolve => {
      mockStorage.savedData = { ...(mockStorage.savedData ?? {}), ...items };
      resolve();
    });
  },
  addChangeListener: jest.fn(),
  removeChangeListener: jest.fn(),
};

/** Set what the background connection check will return. */
function mockCheck(status: OllamaConnectionStatus) {
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
      type: 'connected',
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
    mockCheck({ type: 'not-running' });

    await renderLocalModelConfig();

    await waitFor(() => {
      expect(
        screen.getByText(/Can't reach Ollama at this address/)
      ).toBeInTheDocument();
    });
  });

  test('shows no-models message when Ollama is running but empty', async () => {
    mockCheck({ type: 'no-models' });

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
    mockCheck({ type: 'not-running' });

    await renderLocalModelConfig();

    await waitFor(() => {
      expect(screen.getByLabelText('Local model')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Local model')).toBeDisabled();
  });

  test('shows text input for custom server instead of dropdown', async () => {
    mockCheck({ type: 'custom-server' });

    await renderLocalModelConfig();

    await waitFor(() => {
      expect(screen.getByLabelText('Model name')).toBeInTheDocument();
    });

    expect(screen.queryByLabelText('Local model')).not.toBeInTheDocument();
  });

  test('auto-selects model when only one is available', async () => {
    mockCheck({ type: 'connected', models: ['llama3.2:latest'] });

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
      localModelEndpoint: 'http://localhost:11434/v1',
      localModelName: 'mistral:latest',
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
      expect(mockStorage.savedData?.localModelEndpoint).toBe(
        'http://127.0.0.1:11434'
      );
    });
  });

  test('persists auto-selected single model to storage', async () => {
    mockCheck({ type: 'connected', models: ['llama3.2:latest'] });

    await renderLocalModelConfig();

    await waitFor(() => {
      expect(mockStorage.savedData?.localModelName).toBe('llama3.2:latest');
    });
  });

  test('clears stale selected model from storage when unavailable', async () => {
    mockStorage.savedData = {
      localModelEndpoint: 'http://localhost:11434',
      localModelName: 'stale:model',
    };
    mockCheck({
      type: 'connected',
      models: ['llama3.2:latest', 'mistral:latest'],
    });

    await renderLocalModelConfig();

    await waitFor(() => {
      expect(mockStorage.savedData?.localModelName).toBe('');
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
      expect(mockStorage.savedData?.localModelName).toBe('mistral:latest');
    });
  });

  test('Check again button triggers connection check', async () => {
    mockCheck({ type: 'not-running' });

    render(<LocalModelConfig storage={mockStorage} />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Check again/i })
      ).toBeInTheDocument();
    });

    mockCheck({ type: 'connected', models: ['llama3.2:latest'] });
    fireEvent.click(screen.getByRole('button', { name: /Check again/i }));

    await waitFor(() => {
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(2);
    });
  });

  test('quality warning alert is always shown', async () => {
    await renderLocalModelConfig();

    expect(
      screen.getByText(/Local models vary in quality/)
    ).toBeInTheDocument();
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
