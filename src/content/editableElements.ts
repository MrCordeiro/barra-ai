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
    return normalizeContentEditableText(this.element);
  }

  setText(newText: string): void {
    this.element.innerText = newText;
  }
}

/**
 * Represents a Lexical framework-managed contenteditable element.
 *
 * Lexical (used by Reddit, WhatsApp, Facebook) maintains its own internal
 * state and reconciles it to the DOM. Direct DOM mutations (innerText, etc.)
 * are silently overwritten. Instead, we must go through the browser's editing
 * pipeline so the framework can intercept and process the change.
 */
class LexicalElement implements EditableElement {
  private element: HTMLElement;
  private insertedLength = 0;

  constructor(element: HTMLElement) {
    this.element = element;
  }

  extractText(): string {
    return normalizeContentEditableText(this.element);
  }

  setText(newText: string): void {
    this.element.focus();

    if (this.insertedLength === 0) {
      // First call: select all existing content (the /ai command) and replace.
      // This works because Lexical's internal selection still matches the DOM
      // at this point (no prior programmatic edits have desynchronised them).
      this.selectAll();
      this.insertViaEditingPipeline(newText);
    } else {
      // Subsequent calls: Lexical's cursor is already at the end of the
      // previously inserted text, so we only insert the new delta.
      // Calling selectAll here would fail because Lexical's internal selection
      // would not match the DOM selection we set programmatically.
      const delta = newText.substring(this.insertedLength);
      if (delta) {
        this.insertViaEditingPipeline(delta);
      }
    }

    this.insertedLength = newText.length;
  }

  private selectAll(): void {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(this.element);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  private insertViaEditingPipeline(text: string): void {
    // execCommand fires beforeinput/input events that Lexical intercepts.
    // It is deprecated but remains the only reliable way to trigger the
    // browser's full editing pipeline programmatically.
    if (!document.execCommand('insertText', false, text)) {
      this.dispatchTextInput(text);
    }
  }

  private dispatchTextInput(text: string): void {
    this.element.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'insertText',
        data: text,
        bubbles: true,
        cancelable: true,
        composed: true,
      })
    );
    this.element.dispatchEvent(
      new InputEvent('input', {
        inputType: 'insertText',
        data: text,
        bubbles: true,
        composed: true,
      })
    );
  }
}

function normalizeContentEditableText(element: HTMLElement): string {
  const dupNewlines = /\s*\n\s*/g;
  const dupWhitespace = /\s{2,}/g;
  return element.innerText
    .replace(dupNewlines, '\n')
    .replace(dupWhitespace, ' ')
    .trim();
}

function isLexicalEditor(element: HTMLElement): boolean {
  return (
    element.hasAttribute('data-lexical-editor') ||
    !!element.closest('[data-lexical-editor]')
  );
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
    if (isLexicalEditor(element)) {
      return new LexicalElement(element);
    }
    return new ContentEditableElement(element);
  }
  return null;
}

export type { EditableElement };
export {
  InputElement,
  ContentEditableElement,
  LexicalElement,
  getEditableElement,
};
