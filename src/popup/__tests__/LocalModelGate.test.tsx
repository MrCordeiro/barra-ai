import { useNavigate } from 'react-router-dom';
import LocalModelGate from '../components/LocalModelGate';
import { fireEvent, render, screen, waitFor } from '../../../jest/test-utils';
import { createMockStorage } from '../__mocks__/storage';
import { STORAGE_KEYS } from '../../storageKeys';

const mockStorage = createMockStorage();

const mockNavigate = jest.fn();

beforeEach(() => {
  mockStorage.savedData = {};
  mockNavigate.mockReset();
  (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
  jest.spyOn(mockStorage, 'set');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('LocalModelGate', () => {
  test('renders heading', () => {
    render(<LocalModelGate storage={mockStorage} />);
    expect(
      screen.getByText(/local models require extra setup/i)
    ).toBeInTheDocument();
  });

  test('clicking "Set it up" saves both keys in a single storage.set call', async () => {
    render(<LocalModelGate storage={mockStorage} />);
    fireEvent.click(screen.getByRole('button', { name: /set it up/i }));
    await waitFor(() => {
      expect(mockStorage.set).toHaveBeenCalledTimes(1);
      expect(mockStorage.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.LOCAL_MODEL_GATE_ACKNOWLEDGED]: 'true',
        [STORAGE_KEYS.LOCAL_MODEL_ENABLED]: 'true',
      });
    });
  });

  test('clicking "Set it up" sets localModelGateAcknowledged to "true"', async () => {
    render(<LocalModelGate storage={mockStorage} />);
    fireEvent.click(screen.getByRole('button', { name: /set it up/i }));
    await waitFor(() => {
      expect(
        mockStorage.savedData?.[STORAGE_KEYS.LOCAL_MODEL_GATE_ACKNOWLEDGED]
      ).toBe('true');
    });
  });

  test('clicking "Set it up" sets localModelEnabled to "true"', async () => {
    render(<LocalModelGate storage={mockStorage} />);
    fireEvent.click(screen.getByRole('button', { name: /set it up/i }));
    await waitFor(() => {
      expect(mockStorage.savedData?.[STORAGE_KEYS.LOCAL_MODEL_ENABLED]).toBe(
        'true'
      );
    });
  });

  test('clicking "Set it up" navigates to /local-model-config', async () => {
    render(<LocalModelGate storage={mockStorage} />);
    fireEvent.click(screen.getByRole('button', { name: /set it up/i }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/local-model-config');
    });
  });

  test('clicking "Not for me" navigates to /settings', () => {
    render(<LocalModelGate storage={mockStorage} />);
    fireEvent.click(screen.getByRole('button', { name: /not for me/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/settings');
  });

  test('clicking "Not for me" does not call storage.set', () => {
    render(<LocalModelGate storage={mockStorage} />);
    fireEvent.click(screen.getByRole('button', { name: /not for me/i }));
    expect(mockStorage.set).not.toHaveBeenCalled();
  });

  test('logs error if storage.set throws on "Set it up"', async () => {
    const errorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    jest
      .spyOn(mockStorage, 'set')
      .mockRejectedValue(new Error('storage failed'));

    render(<LocalModelGate storage={mockStorage} />);
    fireEvent.click(screen.getByRole('button', { name: /set it up/i }));

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error acknowledging local model gate:')
      );
    });
  });
});
