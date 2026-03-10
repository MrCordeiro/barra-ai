'use strict';

/**
 * Reads an SSE ReadableStream and calls extractText for each complete "data: ..." line.
 * Returns the accumulated full text (non-empty strings only).
 *
 * @param body The ReadableStream from a streaming fetch response
 * @param extractText Called with the raw value after "data: "; return the text to accumulate, or "" to skip
 */
export async function parseSSEStream(
  body: ReadableStream<Uint8Array>,
  extractText: (dataLine: string) => string
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  for (
    let chunk = await reader.read();
    !chunk.done;
    chunk = await reader.read()
  ) {
    buffer += decoder.decode(chunk.value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const text = extractText(line.slice(5).replace(/^ /, ''));
      if (text) fullText += text;
    }
  }
  return fullText;
}
