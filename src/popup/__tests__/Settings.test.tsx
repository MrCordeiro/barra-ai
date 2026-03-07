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
};

// Get the first OpenAI model that is not the default model
const openAIModel = LLM_MODEL_OPTIONS.find(
  model =>
    model.value !== DEFAULT_LLM_MODEL.value && model.provider === 'openai'
)?.value;

// Get a Claude model for Anthropic-specific tests
const claudeModel = LLM_MODEL_OPTIONS.find(
  model => model.provider === 'anthropic'
)?.value;

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
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('should display a blank settings form', () => {
    render(<Settings storage={mockStorage} />);

    const apiKeyInput = screen.getByLabelText(/API Key/i);
    expect(apiKeyInput).toHaveValue('');

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

  test('changes API key value', async () => {
    const { getByRole, getByLabelText } = render(
      <Settings storage={mockStorage} />
    );

    const apiKeyInput = await getByLabelText(/API Key/i);
    fireEvent.change(apiKeyInput, { target: { value: 'new-key' } });
    expect(apiKeyInput).toHaveValue('new-key');

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

    fireEvent.change(getByLabelText(/API Key/i), {
      target: { value: 'newApiKey' },
    });
    fireEvent.change(getByLabelText(/Model Name/i), {
      target: { value: openAIModel },
    });
    fireEvent.click(getByRole('button', { name: /Save/i }));

    expect(mockStorage.savedData).toEqual({
      apiKey: 'newApiKey',
      anthropicApiKey: '',
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

  test('shows Anthropic API Key field when a Claude model is selected', () => {
    const { getByLabelText } = render(<Settings storage={mockStorage} />);

    fireEvent.change(getByLabelText(/Model Name/i), {
      target: { value: claudeModel },
    });

    const apiKeyInput = getByLabelText(/API Key/i);
    expect(apiKeyInput).toHaveAttribute('name', 'anthropicApiKey');
  });

  test('handleSubmit saves anthropicApiKey when a Claude model is selected', () => {
    const mockNavigate = jest.fn();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    const mockToast = jest.fn();
    (useToast as jest.Mock).mockReturnValue(mockToast);

    const { getByLabelText, getByRole } = render(
      <Settings storage={mockStorage} />
    );

    fireEvent.change(getByLabelText(/Model Name/i), {
      target: { value: claudeModel },
    });
    fireEvent.change(getByLabelText(/API Key/i), {
      target: { value: 'my-claude-key' },
    });
    fireEvent.click(getByRole('button', { name: /Save/i }));

    expect(mockStorage.savedData).toEqual({
      apiKey: '',
      anthropicApiKey: 'my-claude-key',
      modelName: claudeModel,
    });
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

    fireEvent.change(getByLabelText(/API Key/i), {
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
});
