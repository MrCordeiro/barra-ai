import { browser } from '../../browser';
import { render, screen, waitFor } from '../../../jest/test-utils';
import Home from '../components/Home';
import { STORAGE_KEYS } from '../../storageKeys';

describe('<Home />', () => {
  const setupStorageMock = (hasKey = false): void => {
    (browser.storage.local.get as jest.Mock).mockResolvedValue(
      hasKey ? { [STORAGE_KEYS.OPENAI_API_KEY]: 'sk-test-key' } : {}
    );
  };

  beforeEach(() => {
    setupStorageMock();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render correctly', async () => {
    render(<Home />);

    await waitFor(() => {
      const headingElement = screen.getByText(/Raawr!! 🦖 Barrasaur is live!/i);
      expect(headingElement).toBeInTheDocument();
    });
  });

  test('shows a warning and settings link when no API key is set', async () => {
    render(<Home hasApiKey={false} />);

    await waitFor(() => {
      expect(screen.getByText(/No API key set/i)).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /Go to Settings/i })
      ).toBeInTheDocument();
    });
  });

  test('hides warning when storage already has an API key', async () => {
    setupStorageMock(true);

    render(<Home hasApiKey={false} />);

    await waitFor(() => {
      expect(screen.queryByText(/No API key set/i)).not.toBeInTheDocument();
    });
  });
});
