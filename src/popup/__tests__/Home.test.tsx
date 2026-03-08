import { render, screen } from '../../../jest/test-utils';
import Home from '../components/Home';

describe('<Home />', () => {
  test('should render correctly', () => {
    render(<Home />);

    const headingElement = screen.getByText(/Raawr!! 🦖 Barrasaur is live!/i);
    expect(headingElement).toBeInTheDocument();
  });

  test('shows a warning and settings link when no API key is set', () => {
    render(<Home hasApiKey={false} />);

    expect(screen.getByText(/No API key set/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Go to Settings/i })
    ).toBeInTheDocument();
  });
});
