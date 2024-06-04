/* eslint-disable @typescript-eslint/await-thenable */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Settings, { Storage } from './Settings';

const mockStorage: Storage & { savedData?: Record<string, string> } = {
  savedData: {},
  get: _keys =>
    new Promise(resolve => {
      resolve({});
    }),
  set: _items => {
    return new Promise(resolve => {
      mockStorage.savedData = _items;
      resolve();
    });
  },
};

// Mock the toast functions
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the useNavigate hook from react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const originalModule =
    jest.requireActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...(originalModule as Record<string, unknown>),
    useNavigate: () => mockNavigate,
  };
});

describe('<Settings />', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('should display a blank settings form', () => {
    render(
      <Router>
        <Settings storage={mockStorage} />
      </Router>
    );

    const apiKeyInput = screen.getByLabelText(/API Key:/i);
    expect(apiKeyInput).toHaveValue('');

    const modelNameSelect = screen.getByLabelText(/Model Name:/i);
    expect(modelNameSelect).toHaveValue('gpt-4o');

    const saveButton = screen.getByRole('button', { name: /Save/i });
    expect(saveButton).toBeDisabled();
  });

  test('changes API key value', async () => {
    const { getByRole, getByLabelText } = render(
      <Router>
        <Settings storage={mockStorage} />
      </Router>
    );

    const apiKeyInput = await getByLabelText(/API Key:/i);
    fireEvent.change(apiKeyInput, { target: { value: 'new-key' } });
    expect(apiKeyInput).toHaveValue('new-key');

    const saveButton = await getByRole('button', { name: /Save/i });
    expect(saveButton).toBeEnabled();
  });

  test('changes model name value', async () => {
    const { getByRole, getByLabelText } = render(
      <Router>
        <Settings storage={mockStorage} />
      </Router>
    );

    const modelNameSelect = await getByLabelText(/Model Name:/i);
    fireEvent.change(modelNameSelect, { target: { value: 'gpt-4' } });
    expect(modelNameSelect).toHaveValue('gpt-4');

    const saveButton = await getByRole('button', { name: /Save/i });
    expect(saveButton).toBeEnabled();
  });

  test("handleSubmit should call storage.set and navigate to '/'", async () => {
    const { getByLabelText, getByRole } = render(
      <Router>
        <Settings storage={mockStorage} />
      </Router>
    );

    fireEvent.change(getByLabelText(/API Key/i), {
      target: { value: 'newApiKey' },
    });
    fireEvent.change(getByLabelText(/Model Name/i), {
      target: { value: 'gpt-4' },
    });
    fireEvent.click(getByRole('button', { name: /Save/i }));

    expect(mockStorage.savedData).toEqual({
      apiKey: 'newApiKey',
      modelName: 'gpt-4',
    });

    // Assert that the toast.success function was called with the correct message
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Settings saved');
    });

    // Assert that navigate function was called with the correct path
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  test('should log an error if we fail useEffect to get saved settings', async () => {
    const mockError = new Error('Mock error message');
    jest.spyOn(mockStorage, 'get').mockImplementation(() => {
      return Promise.reject(mockError);
    });
    jest.spyOn(console, 'error').mockImplementation(() => null);

    render(
      <Router>
        <Settings storage={mockStorage} />
      </Router>
    );

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(mockError);
    });
  });

  test('handleSubmit should show an error toast if storage.set fails', async () => {
    const mockError = new Error('Mock error message');
    jest.spyOn(mockStorage, 'set').mockImplementation(() => {
      return Promise.reject(mockError);
    });
    jest.spyOn(console, 'error').mockImplementation(() => null);

    const { getByLabelText, getByRole } = render(
      <Router>
        <Settings storage={mockStorage} />
      </Router>
    );

    fireEvent.change(getByLabelText(/API Key/i), {
      target: { value: 'newApiKey' },
    });
    fireEvent.change(getByLabelText(/Model Name/i), {
      target: { value: 'gpt-4' },
    });
    fireEvent.click(getByRole('button', { name: /Save/i }));

    // Assert that the toast.error function was called with the correct message
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to save settings');
    });
    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(mockError);
    });
  });
});
