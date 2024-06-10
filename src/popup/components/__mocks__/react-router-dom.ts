import { jest } from '@jest/globals';

const originalModule =
  jest.requireActual<typeof import('react-router-dom')>('react-router-dom');

module.exports = {
  ...originalModule,
  useNavigate: jest.fn(),
  useLocation: jest.fn(),
};
