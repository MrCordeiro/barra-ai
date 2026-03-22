/* eslint-disable @typescript-eslint/await-thenable */
import { useNavigate } from 'react-router-dom';
import { useToast } from '@chakra-ui/react';
import { render, screen, fireEvent, waitFor } from '../../../jest/test-utils';
import { DEFAULT_LLM_MODEL, LLM_MODEL_OPTIONS } from '../../models';
import { Storage } from '../../storages';
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
      mockStorage.savedData = _items;
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

const geminiModel = LLM_MODEL_OPTIONS.find(
  model => model.provider === 'gemini'
)!.value;

// Mock the toast functions
jest.mock('@chakra-ui/react', () => {
  const originalModule =
    jest.requireActual<typeof import('@chakra-ui/react')>('@chakra-ui/react');
  return {
    ...originalModule,
    useToast: jest.fn(),
  };
});

describe('<Settings />', () => {
  beforeEach(() => {
    mockStorage.savedData = {};
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('should display a blank settings form', () => {
    render(<Settings storage={mockStorage} />);

    const openaiKeyInput = screen.getByLabelText(/OpenAI API Key/i);
    expect(openaiKeyInput).toHaveValue('');

    const anthropicKeyInput = screen.queryByLabelText(/Anthropic API Key/i);
    expect(anthropicKeyInput).not.toBeInTheDocument();

    const modelNameSelect = screen.getByLabelText(/Model Name/i);
    expect(modelNameSelect).toHaveValue(DEFAULT_LLM_MODEL.value);

    const saveButton = screen.getByRole('button', { name: /Save/i });
    expect(saveButton).toBeDisabled();
  });

  test('should show an onboarding message if showOnboarding is true', () => {
    render(<Settings storage={mockStorage} showOnboarding />);

    const onboardingMessage = screen.getByText(/Welcome!/i);
    expect(onboardingMessage).toBeInTheDocument();
  });

  test('changes OpenAI API key value', async () => {
    const { getByRole, getByLabelText } = render(
      <Settings storage={mockStorage} />
    );

    const apiKeyInput = await getByLabelText(/OpenAI API Key/i);
    fireEvent.change(apiKeyInput, { target: { value: 'new-openai-key' } });
    expect(apiKeyInput).toHaveValue('new-openai-key');

    const saveButton = await getByRole('button', { name: /Save/i });
    expect(saveButton).toBeEnabled();
  });

  test('changes Anthropic API key value', async () => {
    const { getByRole, getByLabelText } = render(
      <Settings storage={mockStorage} />
    );

    const modelNameSelect = await getByLabelText(/Model Name/i);
    fireEvent.change(modelNameSelect, {
      target: { value: anthropicModel },
    });

    const apiKeyInput = await getByLabelText(/Anthropic API Key/i);
    fireEvent.change(apiKeyInput, { target: { value: 'new-anthropic-key' } });
    expect(apiKeyInput).toHaveValue('new-anthropic-key');

    const saveButton = await getByRole('button', { name: /Save/i });
    expect(saveButton).toBeEnabled();
  });

  test('changes model name value', async () => {
    const { getByRole, getByLabelText } = render(
      <Settings storage={mockStorage} />
    );

    const modelNameSelect = await getByLabelText(/Model Name/i);
    fireEvent.change(modelNameSelect, {
      target: { value: openAIModel },
    });
    expect(modelNameSelect).toHaveValue(openAIModel);

    const saveButton = await getByRole('button', { name: /Save/i });
    expect(saveButton).toBeEnabled();
  });

  test("handleSubmit should call storage.set and navigate to '/'", async () => {
    const mockNavigate = jest.fn();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    const mockToast = jest.fn();
    (useToast as jest.Mock).mockReturnValue(mockToast);

    const { getByLabelText, getByRole } = render(
      <Settings storage={mockStorage} />
    );

    fireEvent.change(getByLabelText(/Model Name/i), {
      target: { value: anthropicModel },
    });
    fireEvent.change(getByLabelText(/Anthropic API Key/i), {
      target: { value: 'my-anthropic-key' },
    });
    fireEvent.change(getByLabelText(/Model Name/i), {
      target: { value: openAIModel },
    });
    fireEvent.change(getByLabelText(/OpenAI API Key/i), {
      target: { value: 'my-openai-key' },
    });
    fireEvent.click(getByRole('button', { name: /Save/i }));

    expect(mockStorage.savedData).toEqual({
      openaiApiKey: 'my-openai-key',
      anthropicApiKey: 'my-anthropic-key',
      geminiApiKey: '',
      modelName: openAIModel,
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        status: 'success',
        title: 'Settings saved! 🎉',
        variant: 'top-accent',
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  test('should log an error if we fail useEffect to get saved settings', async () => {
    const mockError = new Error('Mock error message');
    jest.spyOn(mockStorage, 'get').mockImplementation(() => {
      return Promise.reject(mockError);
    });
    jest.spyOn(console, 'error').mockImplementation(() => null);

    render(<Settings storage={mockStorage} />);

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        `Error loading settings: ${mockError.message}`
      );
    });
  });

  test('handleSubmit should show an error toast if storage.set fails', async () => {
    const mockError = new Error('Mock error message');
    jest.spyOn(mockStorage, 'set').mockImplementation(() => {
      return Promise.reject(mockError);
    });
    jest.spyOn(console, 'error').mockImplementation(() => null);

    const mockToast = jest.fn();
    (useToast as jest.Mock).mockReturnValue(mockToast);

    const { getByLabelText, getByRole } = render(
      <Settings storage={mockStorage} />
    );

    fireEvent.change(getByLabelText(/OpenAI API Key/i), {
      target: { value: 'newApiKey' },
    });
    fireEvent.change(getByLabelText(/Model Name/i), {
      target: { value: openAIModel },
    });
    fireEvent.click(getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        status: 'error',
        title: 'Failed to save settings 😢',
        variant: 'top-accent',
      });
    });
    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        `Error saving settings: ${mockError.message}`
      );
    });
  });

  test('shows only the API key input for the selected provider', async () => {
    const { getByLabelText, queryByLabelText } = render(
      <Settings storage={mockStorage} />
    );

    expect(getByLabelText(/OpenAI API Key/i)).toBeInTheDocument();
    expect(queryByLabelText(/Anthropic API Key/i)).not.toBeInTheDocument();

    const modelNameSelect = getByLabelText(/Model Name/i);
    fireEvent.change(modelNameSelect, { target: { value: anthropicModel } });

    await waitFor(() => {
      expect(getByLabelText(/Anthropic API Key/i)).toBeInTheDocument();
    });
    expect(queryByLabelText(/OpenAI API Key/i)).not.toBeInTheDocument();
  });

  test('shows only the Gemini API key input when a Gemini model is selected', async () => {
    const { getByLabelText, queryByLabelText } = render(
      <Settings storage={mockStorage} />
    );

    const modelNameSelect = getByLabelText(/Model Name/i);
    fireEvent.change(modelNameSelect, { target: { value: geminiModel } });

    await waitFor(() => {
      expect(getByLabelText(/Gemini API Key/i)).toBeInTheDocument();
    });
    expect(queryByLabelText(/OpenAI API Key/i)).not.toBeInTheDocument();
    expect(queryByLabelText(/Anthropic API Key/i)).not.toBeInTheDocument();
  });
});
