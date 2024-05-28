/**
 * Represents an editable element.
 */
interface EditableElement {
  /**
   * Extracts the text from the editable element.
   * @returns The extracted text.
   */
  extractText(): string;

  /**
   * Sets the text of the editable element.
   * @param newText - The new text to set.
   */
  setText(newText: string): void;
}

/**
 * Represents an input element
 */
class InputElement implements EditableElement {
  private element: HTMLInputElement | HTMLTextAreaElement;

  constructor(element: HTMLInputElement | HTMLTextAreaElement) {
    this.element = element;
  }

  extractText(): string {
    return this.element.value;
  }

  setText(newText: string): void {
    this.element.value = newText;
  }
}

/**
 * Represents a content editable div element
 */
class ContentEditableElement implements EditableElement {
  private element: HTMLElement;

  constructor(element: HTMLElement) {
    this.element = element;
  }

  extractText(): string {
    const dupNewlines = /\s*\n\s*/g;
    const dupWhitespace = /\s{2,}/g;
    return this.element.innerText
      .replace(dupNewlines, '\n')
      .replace(dupWhitespace, ' ')
      .trim();
  }

  setText(newText: string): void {
    this.element.innerText = newText;
  }
}

/**
 * Gets the editable element from the given element if available.
 * @param element - The element to get the editable element from.
 * @returns The editable element if found, otherwise undefined.
 */
function getEditableElement(element: HTMLElement): EditableElement | null {
  // No password fields should be edited.
  if (element.getAttribute('type') === 'password') {
    return null;
  }

  if (element.tagName === 'INPUT') {
    return new InputElement(element as HTMLInputElement);
  } else if (element.tagName === 'TEXTAREA') {
    return new InputElement(element as HTMLTextAreaElement);
  } else if (element.isContentEditable) {
    return new ContentEditableElement(element);
  }
  return null;
}

export type { EditableElement };
export { InputElement, ContentEditableElement, getEditableElement };
