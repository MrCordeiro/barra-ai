import { render, screen } from '../../../jest/test-utils';
import Home from '../components/Home';

describe('<Home />', () => {
  test('should render correctly', () => {
    render(<Home />);

    const headingElement = screen.getByText(/Raawr!! 🦖 Barrasaur is live!/i);
    expect(headingElement).toBeInTheDocument();
  });
});
