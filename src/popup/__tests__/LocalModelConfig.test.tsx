import { render, screen, fireEvent, waitFor } from '../../../jest/test-utils';
import { Storage } from '../../storages';
import LocalModelConfig from '../components/LocalModelConfig';
import * as ollamaModule from '../../content/ollama';

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

describe('<LocalModelConfig />', () => {
  beforeEach(() => {
    mockStorage.savedData = {};
    jest.spyOn(ollamaModule, 'checkOllamaConnection').mockResolvedValue({
      type: 'connected',
      models: ['llama3.2:latest', 'mistral:latest'],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('renders with default endpoint and heading', () => {
    render(<LocalModelConfig storage={mockStorage} />);

    expect(screen.getByText('Local Model Setup')).toBeInTheDocument();
    const endpointInput = screen.getByLabelText('Ollama endpoint');
    expect(endpointInput).toHaveValue('http://localhost:11434');
  });

  test('shows connected status after connection check succeeds', async () => {
    render(<LocalModelConfig storage={mockStorage} />);

    await waitFor(() => {
      expect(
        screen.getByText(/Connected — 2 models available/)
      ).toBeInTheDocument();
    });
  });

  test('shows not-running error when connection fails', async () => {
    jest
      .spyOn(ollamaModule, 'checkOllamaConnection')
      .mockResolvedValue({ type: 'not-running' });

    render(<LocalModelConfig storage={mockStorage} />);

    await waitFor(() => {
      expect(
        screen.getByText(/Can't reach Ollama at this address/)
      ).toBeInTheDocument();
    });
  });

  test('shows no-models message when Ollama is running but empty', async () => {
    jest
      .spyOn(ollamaModule, 'checkOllamaConnection')
      .mockResolvedValue({ type: 'no-models' });

    render(<LocalModelConfig storage={mockStorage} />);

    await waitFor(() => {
      expect(
        screen.getByText(/Connected, but no models found/)
      ).toBeInTheDocument();
    });
  });

  test('shows model dropdown when connected', async () => {
    render(<LocalModelConfig storage={mockStorage} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Local model')).toBeInTheDocument();
    });

    const select = screen.getByLabelText('Local model');
    expect(select).not.toBeDisabled();
  });

  test('model dropdown is disabled when not connected', async () => {
    jest
      .spyOn(ollamaModule, 'checkOllamaConnection')
      .mockResolvedValue({ type: 'not-running' });

    render(<LocalModelConfig storage={mockStorage} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Local model')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Local model')).toBeDisabled();
  });

  test('shows text input for custom server instead of dropdown', async () => {
    jest
      .spyOn(ollamaModule, 'checkOllamaConnection')
      .mockResolvedValue({ type: 'custom-server' });

    render(<LocalModelConfig storage={mockStorage} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Model name')).toBeInTheDocument();
    });

    expect(screen.queryByLabelText('Local model')).not.toBeInTheDocument();
  });

  test('auto-selects model when only one is available', async () => {
    jest.spyOn(ollamaModule, 'checkOllamaConnection').mockResolvedValue({
      type: 'connected',
      models: ['llama3.2:latest'],
    });

    render(<LocalModelConfig storage={mockStorage} />);

    await waitFor(() => {
      const select = screen.getByLabelText('Local model');
      expect(select.value).toBe('llama3.2:latest');
    });
  });

  test('shows :latest-stripped display name in dropdown options', async () => {
    render(<LocalModelConfig storage={mockStorage} />);

    await waitFor(() => {
      expect(screen.getByText('llama3.2')).toBeInTheDocument();
      expect(screen.getByText('mistral')).toBeInTheDocument();
    });
  });

  test('shows endpoint validation error on blur with invalid URL', async () => {
    render(<LocalModelConfig storage={mockStorage} />);

    const endpointInput = screen.getByLabelText('Ollama endpoint');
    fireEvent.change(endpointInput, { target: { value: 'not-a-url' } });
    fireEvent.blur(endpointInput);

    await waitFor(() => {
      expect(screen.getByText(/Must be a valid URL/)).toBeInTheDocument();
    });
  });

  test('loads saved endpoint and model from storage', async () => {
    mockStorage.savedData = {
      localModelEndpoint: 'http://192.168.1.5:11434',
      localModelName: 'mistral:latest',
    };

    render(<LocalModelConfig storage={mockStorage} />);

    await waitFor(() => {
      const endpointInput = screen.getByLabelText(
        'Ollama endpoint'
      );
      expect(endpointInput.value).toBe('http://192.168.1.5:11434');
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
    jest
      .spyOn(ollamaModule, 'checkOllamaConnection')
      .mockResolvedValue({ type: 'not-running' });

    render(<LocalModelConfig storage={mockStorage} />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Check again/i })
      ).toBeInTheDocument();
    });

    const checkAgainSpy = jest
      .spyOn(ollamaModule, 'checkOllamaConnection')
      .mockResolvedValue({ type: 'connected', models: ['llama3.2:latest'] });

    fireEvent.click(screen.getByRole('button', { name: /Check again/i }));

    await waitFor(() => {
      expect(checkAgainSpy).toHaveBeenCalled();
    });
  });

  test('quality warning alert is always shown', () => {
    render(<LocalModelConfig storage={mockStorage} />);

    expect(
      screen.getByText(/Local models vary in quality/)
    ).toBeInTheDocument();
  });
});
