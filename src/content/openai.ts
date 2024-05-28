'use strict';

const API_KEY: string = process.env.OPENAI_API_KEY as string;
export const USE_MOCK: boolean =
  process.env.USE_MOCK && /^(?:y|yes|true|1)$/i.test(process.env.USE_MOCK)
    ? true
    : false;

interface GPTResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Fetches the GPT response from the OpenAI API
 *
 * @param prompt The prompt to be used for the GPT response
 */
export async function fetchGptResponse(prompt: string): Promise<string> {
  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo-0125',
      messages: [
        { role: 'system', content: 'You are a savvy social media expert.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 200,
    }),
  };

  const response = await fetch(
    'https://api.openai.com/v1/chat/completions',
    requestOptions
  );
  const data = await response.json();
  return parseAnswer(data);
}

/**
 * Parses the GPT response to extract the answer
 *
 * @param data The GPT response data
 */
function parseAnswer(data: GPTResponse): string {
  const answer = data.choices[0].message.content;
  return answer;
}

/**
 * A dummy function to mock the fetchGptResponse function without making an
 * actual API call
 *
 * @param prompt The prompt to be used for the mock response
 */

async function fetchGptMockResponse(): Promise<string> {
  return "🚀 Exciting news for all my fellow content creators and writers! \
  Just discovered an amazing extension that lets you effortlessly generate \
  GPT-powered texts with just a simple 'ai' command. Say goodbye to writer's \
  block and hello to endless possibilities! 📝💡 \
  #AI #ContentCreation #Innovation";
}

/**
 * Fetches the GPT response from the OpenAI API
 *
 * @param prompt The prompt to be used for the GPT response
 */
export async function fetchAIResponse(prompt: string): Promise<string> {
  if (USE_MOCK) {
    return fetchGptMockResponse();
  } else {
    /* istanbul ignore next */
    return fetchGptResponse(prompt);
  }
}
