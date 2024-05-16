/**
 * Extracts text from an HTML element.
 *
 * @param element - The HTML element from which to extract text.
 * @returns The extracted text.
 */
export function extractTextFromElement(element: HTMLElement): string {
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  ) {
    return element.value;
  } else if (element.isContentEditable) {
    const dupNewlines = /\s*\n\s*/g;
    const dupWhitespace = /\s{2,}/g;
    return element.innerText
      .replace(dupNewlines, '\n')
      .replace(dupWhitespace, ' ')
      .trim();
  }
  return '';
}

/**
 * Sets the text content of an HTML element.
 *
 * @param newText - The new text content to set.
 * @param element - The HTML element to set the text content for.
 */
export function setTextToElement(newText: string, element: HTMLElement) {
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  ) {
    element.value = newText;
  } else if (element.isContentEditable) {
    element.innerText = newText;
  }
}
