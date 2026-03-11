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
    this.element = resolveLexicalRoot(element);
  }

  extractText(): string {
    return normalizeContentEditableText(this.element);
  }

  setText(newText: string): void {
    this.element.focus();

    if (this.insertedLength === 0) {
      // First call: select all existing content (the /ai command) and replace.
      // Lexical's editor.update() syncs the DOM selection into its internal
      // state before running the paste handler, so selectAll() works here.
      this.selectAll();
      this.pasteText(newText);
      console.debug(`Inserted initial text into Lexical editor: "${newText}"`);
    } else {
      // Subsequent calls: Lexical's cursor is already at the end of the
      // previously inserted text, so we only paste the new delta.
      const delta = newText.substring(this.insertedLength);
      if (delta) {
        this.pasteText(delta);
        console.debug(`Inserted delta text into Lexical editor: "${delta}"`);
      }
    }

    this.insertedLength = newText.length;
  }

  private selectAll(): void {
    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    // Getting start-end nodes improves Lexical's chance of syncing DOM
    // selection into its internal model before paste.
    const startNode = this.getBoundaryTextNode('start');
    const endNode = this.getBoundaryTextNode('end');

    if (startNode && endNode) {
      range.setStart(startNode, 0);
      range.setEnd(endNode, endNode.textContent?.length ?? 0);
    } else {
      range.selectNodeContents(this.element);
    }

    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  }

  private getBoundaryTextNode(boundary: 'start' | 'end'): Text | null {
    const walker = document.createTreeWalker(
      this.element,
      NodeFilter.SHOW_TEXT
    );
    if (boundary === 'start') {
      return walker.nextNode() as Text | null;
    }

    let lastNode: Text | null = null;
    while (walker.nextNode()) {
      lastNode = walker.currentNode as Text;
    }
    return lastNode;
  }

  private pasteText(text: string): void {
    // Simulate a clipboard paste. Lexical's paste handler reads
    // clipboardData, splits on newlines to create paragraphs, and
    // replaces the current selection — exactly the behaviour we need.
    // Unlike execCommand (deprecated, newlines silently dropped),
    // paste events are a stable, well-supported API.
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', text);
    // ClipboardEventInit typings omit clipboardData, but all browsers
    // support it in the constructor. Cast to work around the gap.
    const init = {
      clipboardData: dataTransfer,
      bubbles: true,
      cancelable: true,
    } as ClipboardEventInit;
    this.element.dispatchEvent(new ClipboardEvent('paste', init));
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

function resolveLexicalRoot(element: HTMLElement): HTMLElement {
  // The actual editable element in a Lexical editor may be a child of the root
  // node marked with data-lexical-editor. If that happens, selection/paste can
  // affect only part of the content.
  const root = element.closest('[data-lexical-editor]');
  return (root as HTMLElement | null) ?? element;
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
