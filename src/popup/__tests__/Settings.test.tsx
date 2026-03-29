import { useNavigate } from 'react-router-dom';
import { useToast } from '@chakra-ui/react';
import { render, screen, fireEvent, waitFor } from '../../../jest/test-utils';
import { DEFAULT_LLM_MODEL, LLM_MODEL_OPTIONS } from '../../models';
import { Storage } from '../../storages';
import { OllamaModelAvailability, OllamaStatus } from '../../content/ollama';
import Settings from '../components/Settings';

/**
 * A mock storage object that saves data in memory
 */
const mockStorage: Storage & { savedData?: Record<string, string> } = {
  savedData: {},
  get: keys => {
    return new Promise(resolve => {
      const data = mockStorage.savedData ?? {};
      if (!keys) {
        return resolve(data);
      }

      const result: Record<string, string> = {};
      (Array.isArray(keys) ? keys : [keys]).forEach(key => {
        if (key in data) {
          result[key] = data[key];
        }
      });
      resolve(result);
    });
  },
  set: _items => {
    return new Promise(resolve => {
      mockStorage.savedData = { ...(mockStorage.savedData ?? {}), ..._items };
      resolve();
    });
  },
  addChangeListener: jest.fn(),
  removeChangeListener: jest.fn(),
};

// Get the first OpenAI model that is not the default model
const openAIModel = LLM_MODEL_OPTIONS.find(
  model =>
    model.value !== DEFAULT_LLM_MODEL.value && model.provider === 'openai'
)!.value;

const anthropicModel = LLM_MODEL_OPTIONS.find(
  model => model.provider === 'anthropic'
)!.value;

jest.mock('@chakra-ui/react', () => {
  const originalModule =
    jest.requireActual<typeof import('@chakra-ui/react')>('@chakra-ui/react');
  return {
    ...originalModule,
    useToast: jest.fn(),
  };
});

function mockOllamaCheck(
  result: OllamaModelAvailability = {
    status: OllamaStatus.NotRunning,
  }
) {
  (chrome.runtime.sendMessage as jest.Mock).mockResolvedValue(result);
}

async function renderSettings(props: { showOnboarding?: boolean } = {}) {
  render(<Settings storage={mockStorage} {...props} />);
  await waitFor(() => {
    expect(chrome.runtime.sendMessage).toHaveBeenCalled();
  });
}

describe('<Settings />', () => {
  beforeEach(() => {
    mockStorage.savedData = {};
    mockOllamaCheck({ status: OllamaStatus.NotRunning });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('renders default settings form', async () => {
    await renderSettings();

    expect(screen.getByLabelText(/Model Name/i)).toHaveValue(
      DEFAULT_LLM_MODEL.value
    );
    expect(screen.getByLabelText(/OpenAI API Key/i)).toHaveValue('');
    expect(screen.getByRole('button', { name: /Save/i })).toBeDisabled();
  });

  test('shows onboarding text when requested', async () => {
    await renderSettings({ showOnboarding: true });
    expect(screen.getByText(/Welcome!/i)).toBeInTheDocument();
  });

  test('shows local model unavailable state in selector', async () => {
    mockOllamaCheck({ status: OllamaStatus.NotRunning });
    await renderSettings();

    await waitFor(() => {
      expect(screen.getByText(/Local models unavailable/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Run: ollama serve/i)).not.toBeInTheDocument();
  });

  test('shows Ollama model list when connected', async () => {
    mockOllamaCheck({
      status: OllamaStatus.Connected,
      models: ['llama3.2:latest', 'mistral:latest'],
    });

    await renderSettings();

    await waitFor(() => {
      expect(screen.getByText('Ollama')).toBeInTheDocument();
      expect(screen.getByText('llama3.2')).toBeInTheDocument();
      expect(screen.getByText('mistral')).toBeInTheDocument();
    });
  });

  test('changes selected cloud model and persists immediately', async () => {
    mockStorage.savedData = { localModelName: 'llama3.2:latest' };
    await renderSettings();

    fireEvent.change(screen.getByLabelText(/Model Name/i), {
      target: { value: openAIModel },
    });

    await waitFor(() => {
      expect(mockStorage.savedData?.modelName).toBe(openAIModel);
      expect(mockStorage.savedData?.localModelName).toBe('llama3.2:latest');
    });
  });

  test.each([
    {
      localModelGateAcknowledged: undefined,
      expectedPath: '/local-model-gate',
      label: 'for first-time selection when gate is not acknowledged',
    },
    {
      localModelGateAcknowledged: 'true',
      expectedPath: '/local-model-config',
      label: 'after gate is acknowledged',
    },
  ])(
    'navigates to $expectedPath when selecting local model $label',
    async ({ localModelGateAcknowledged, expectedPath }) => {
      const mockNavigate = jest.fn();
      (useNavigate as jest.Mock).mockReturnValue(mockNavigate);

      mockStorage.savedData = localModelGateAcknowledged
        ? { localModelGateAcknowledged }
        : {};

      mockOllamaCheck({
        status: OllamaStatus.Connected,
        models: ['llama3.2:latest'],
      });

      await renderSettings();

      await waitFor(() => {
        expect(screen.getByText('llama3.2')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Model Name/i), {
        target: { value: 'llama3.2:latest' },
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(expectedPath);
      });
    }
  );

  test('selecting configured local model persists local selection', async () => {
    const mockToast = jest.fn();
    (useToast as jest.Mock).mockReturnValue(mockToast);

    mockStorage.savedData = {
      localModelEndpoint: 'http://localhost:11434',
      localModelName: 'mistral:latest',
      modelName: anthropicModel,
    };

    mockOllamaCheck({
      status: OllamaStatus.Connected,
      models: ['llama3.2:latest', 'mistral:latest'],
    });

    await renderSettings();

    await waitFor(() => {
      expect(screen.getByText('llama3.2')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Model Name/i), {
      target: { value: 'llama3.2:latest' },
    });

    await waitFor(() => {
      expect(mockStorage.savedData?.modelName).toBe('llama3.2:latest');
      expect(mockStorage.savedData?.localModelName).toBe('llama3.2:latest');
    });
  });

  test('shows local connected status line when a local model is selected', async () => {
    mockStorage.savedData = {
      localModelEndpoint: 'http://localhost:11434',
      localModelName: 'llama3.2:latest',
      modelName: 'llama3.2:latest',
    };
    mockOllamaCheck({
      status: OllamaStatus.Connected,
      models: ['llama3.2:latest'],
    });

    await renderSettings();

    await waitFor(() => {
      expect(screen.getByText(/llama3\.2 · Connected/)).toBeInTheDocument();
    });

    expect(screen.queryByLabelText(/OpenAI API Key/i)).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Anthropic API Key/i)
    ).not.toBeInTheDocument();
  });

  test('falls back to default cloud model when selected local model disappears', async () => {
    mockStorage.savedData = {
      localModelEndpoint: 'http://localhost:11434',
      localModelName: 'llama3.2:latest',
      modelName: 'llama3.2:latest',
    };
    mockOllamaCheck({
      status: OllamaStatus.Connected,
      models: ['mistral:latest'],
    });

    await renderSettings();

    await waitFor(() => {
      expect(mockStorage.savedData?.modelName).toBe(DEFAULT_LLM_MODEL.value);
      expect(mockStorage.savedData?.localModelName).toBe('');
    });
  });

  test('saves cloud API keys via Save button', async () => {
    const mockNavigate = jest.fn();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    const mockToast = jest.fn();
    (useToast as jest.Mock).mockReturnValue(mockToast);

    await renderSettings();

    fireEvent.change(screen.getByLabelText(/Model Name/i), {
      target: { value: anthropicModel },
    });
    fireEvent.change(screen.getByLabelText(/Anthropic API Key/i), {
      target: { value: 'my-anthropic-key' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(mockStorage.savedData).toMatchObject({
        anthropicApiKey: 'my-anthropic-key',
      });
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'success' })
    );
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
