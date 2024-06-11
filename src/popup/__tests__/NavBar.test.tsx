/* eslint-disable @typescript-eslint/await-thenable */
import { useNavigate, useLocation } from 'react-router-dom';
import { render, screen, fireEvent } from '../../../jest/test-utils';
import NavBar from '../components/NavBar';

describe('NavBar', () => {
  test('is rendered correctly', () => {
    (useLocation as jest.Mock).mockReturnValue({ pathname: '/' });

    render(<NavBar />);

    const backButton = screen.queryByLabelText('Go back to Home');
    const settingsButton = screen.getByLabelText('Settings');

    expect(backButton).not.toBeInTheDocument();
    expect(settingsButton).toBeInTheDocument();
  });

  const testCases = [
    {
      description: 'allows to navigate to settings page',
      initialPath: '/',
      buttonLabel: 'Settings',
      expectedPath: '/settings',
    },
    {
      description: 'go back to home page',
      initialPath: '/settings',
      buttonLabel: 'Go back to Home',
      expectedPath: '/',
    },
  ];

  testCases.forEach(
    ({ description, initialPath, buttonLabel, expectedPath }) => {
      test(description, async () => {
        const mockNavigate = jest.fn();
        (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
        (useLocation as jest.Mock).mockReturnValue({ pathname: initialPath });

        const { getByLabelText } = render(<NavBar />);

        const button = await getByLabelText(buttonLabel);
        fireEvent.click(button);
        expect(mockNavigate).toHaveBeenCalledWith(expectedPath);
      });
    }
  );
});
