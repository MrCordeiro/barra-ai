import { render, screen } from '@testing-library/react';
import Home from './Home';

describe('<Home />', () => {
  test('should render correctly', () => {
    render(<Home />);

    const headingElement = screen.getByText(/Raawr!! 🦖 Barrasaur is live!/i);
    expect(headingElement).toBeInTheDocument();
  });
});
