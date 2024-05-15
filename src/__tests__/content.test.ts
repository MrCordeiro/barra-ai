describe('Environment Variable USE_MOCK', () => {
  const testCases = [
    { envValue: '1', expected: true },
    { envValue: '0', expected: false },
    { envValue: 'true', expected: true },
    { envValue: 'false', expected: false },
    { envValue: true, expected: true },
    { envValue: false, expected: false },
    { envValue: undefined, expected: false },
  ];

  testCases.forEach(({ envValue, expected }) => {
    test(`should set USE_MOCK to ${expected} for env value ${envValue}`, () => {
      process.env.USE_MOCK = envValue as string;

      // Reset module registry to re-import with new env variable
      jest.resetModules();
      const { USE_MOCK: USE_MOCK } = require('../content');
      expect(USE_MOCK).toBe(expected);
    });
  });
});

describe('fetchAIResponse', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.USE_MOCK = 'true';
  });

  test('should return a mock response when USE_MOCK is true', async () => {
    const prompt = 'Write a LinkedIn post about AI';
    const expectedResponse =
      "🚀 Exciting news for all my fellow content creators and writers! \
  Just discovered an amazing extension that lets you effortlessly generate \
  GPT-powered texts with just a simple 'ai' command. Say goodbye to writer's \
  block and hello to endless possibilities! 📝💡 \
  #AI #ContentCreation #Innovation";

    const { fetchAIResponse } = require('../content');
    const response = await fetchAIResponse(prompt);

    expect(response).toBe(expectedResponse);
  });
});
