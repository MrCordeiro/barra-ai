'use strict';

/**
 * Extracts a human-readable error message from a failed provider response.
 * Tries JSON first (looking for data.error.message), falls back to statusText.
 */
export async function extractErrorMessage(response: Response): Promise<string> {
  let message = response.statusText;
  try {
    const data = (await response.json()) as { error?: { message?: string } };
    message = data.error?.message ?? message;
  } catch {
    // JSON parsing failed; fall back to statusText
  }
  return message;
}
