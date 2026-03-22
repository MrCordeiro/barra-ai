import { extractErrorMessage } from '../providerError';

describe('extractErrorMessage', () => {
  test('should extract error.message from JSON response', async () => {
    const response = {
      statusText: 'Bad Request',
      json: () => Promise.resolve({ error: { message: 'Invalid API key' } }),
    } as unknown as Response;

    expect(await extractErrorMessage(response)).toBe('Invalid API key');
  });

  test('should fall back to statusText when error.message is missing', async () => {
    const response = {
      statusText: 'Bad Request',
      json: () => Promise.resolve({ error: {} }),
    } as unknown as Response;

    expect(await extractErrorMessage(response)).toBe('Bad Request');
  });

  test('should fall back to statusText when error field is missing', async () => {
    const response = {
      statusText: 'Forbidden',
      json: () => Promise.resolve({ someOtherField: true }),
    } as unknown as Response;

    expect(await extractErrorMessage(response)).toBe('Forbidden');
  });

  test('should fall back to statusText when JSON parsing fails', async () => {
    const response = {
      statusText: 'Service Unavailable',
      json: () => Promise.reject(new Error('not json')),
    } as unknown as Response;

    expect(await extractErrorMessage(response)).toBe('Service Unavailable');
  });
});
