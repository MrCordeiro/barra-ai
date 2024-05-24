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
    return cleanText(this.element.innerText);
  }

  setText(newText: string): void {
    this.element.innerText = newText;
  }
}

declare global {
  interface HTMLElement {
    __lexicalEditor?: {
      update: (callback: () => void, options?: { discrete: boolean }) => void;
      getEditorState: () => any;
    };
  }
}

/**
 * Represents an Lexical editor element
 */
class LexicalElement implements EditableElement {
  private element: HTMLElement;

  constructor(element: HTMLElement) {
    this.element = element;
  }

  extractText(): string {
    return cleanText(this.element.innerText);
  }

  setText(newText: string): void {
    const textNode = document.createTextNode(newText);
    // Replace the content of the this.element with the new text node. Wrapped
    // with a paragraph node.
    const pNode = document.createElement('p');
    pNode.appendChild(textNode);

    // Replace this.element's first paragraph node with the new paragraph node.
    const pToReplace = this.element.querySelector('p');
    if (pToReplace) {
      pToReplace.replaceWith(pNode);
    }

    // Update the editor state.
    const inputEvent = new InputEvent('input', {
      inputType: 'insertText',
      data: newText,
      bubbles: true,
      cancelable: true,
    });
    this.element.dispatchEvent(inputEvent);
  }
}

function cleanText(text: string): string {
  const dupNewlines = /\s*\n\s*/g;
  const dupWhitespace = /\s{2,}/g;
  return text.replace(dupNewlines, '\n').replace(dupWhitespace, ' ').trim();
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
  } else if (
    element.isContentEditable &&
    element.dataset.lexicalEditor !== 'true'
  ) {
    return new ContentEditableElement(element);
  } else if (element.dataset.lexicalEditor === 'true') {
    return new LexicalElement(element);
  }
  return null;
}

export {
  EditableElement,
  InputElement,
  ContentEditableElement,
  LexicalElement,
  getEditableElement,
};
