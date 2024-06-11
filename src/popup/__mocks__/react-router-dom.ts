import { jest } from '@jest/globals';

const originalModule =
  jest.requireActual<typeof import('react-router-dom')>('react-router-dom');

/**
 * The useNavigate and useLocation hooks will be replaced by mocks in the tests.
 * You can control their behavior by importing them from react-router-dom and
 * mocking their return values. For example:
 *
 * >>> import { useLocation } from 'react-router-dom';
 * >>> (useLocation as jest.Mock).mockReturnValue({ pathname: '/' });
 */
module.exports = {
  ...originalModule,
  useNavigate: jest.fn(),
  useLocation: jest.fn(),
};
