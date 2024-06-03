/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Settings, { Storage } from './Settings';

const mockStorage: Storage & { savedData?: Record<string, string> } = {
  savedData: {},
  get: (_keys, callback) => callback({}),
  set: (_items, callback) => {
    callback();
    mockStorage.savedData = _items;
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

  test('changes API key value', () => {
    render(
      <Router>
        <Settings storage={mockStorage} />
      </Router>
    );

    const apiKeyInput = screen.getByLabelText(/API Key:/i);
    fireEvent.change(apiKeyInput, { target: { value: 'new-key' } });
    expect(apiKeyInput).toHaveValue('new-key');

    const saveButton = screen.getByRole('button', { name: /Save/i });
    expect(saveButton).toBeEnabled();
  });

  test('changes model name value', () => {
    render(
      <Router>
        <Settings storage={mockStorage} />
      </Router>
    );

    const modelNameSelect = screen.getByLabelText(/Model Name:/i);

    fireEvent.change(modelNameSelect, { target: { value: 'gpt-4' } });
    expect(modelNameSelect).toHaveValue('gpt-4');

    const saveButton = screen.getByRole('button', { name: /Save/i });
    expect(saveButton).toBeEnabled();
  });

  test("handleSave should call storage.set and navigate to '/'", async () => {
    render(
      <Router>
        <Settings storage={mockStorage} />
      </Router>
    );

    fireEvent.change(screen.getByLabelText(/API Key/i), {
      target: { value: 'newApiKey' },
    });
    fireEvent.change(screen.getByLabelText(/Model Name/i), {
      target: { value: 'gpt-4' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

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

  test('handleSave should show an error toast if storage.set fails', async () => {
    jest.spyOn(mockStorage, 'set').mockImplementation(() => {
      throw new Error('Mock error message');
    });
    jest.spyOn(console, 'error').mockImplementation(() => null);

    render(
      <Router>
        <Settings storage={mockStorage} />
      </Router>
    );

    fireEvent.change(screen.getByLabelText(/API Key/i), {
      target: { value: 'newApiKey' },
    });
    fireEvent.change(screen.getByLabelText(/Model Name/i), {
      target: { value: 'gpt-4' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    // Assert that the toast.error function was called with the correct message
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to save settings');
    });
  });
});
