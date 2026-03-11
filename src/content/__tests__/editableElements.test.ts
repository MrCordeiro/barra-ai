import {
  getEditableElement,
  ContentEditableElement,
  InputElement,
  LexicalElement,
} from '../editableElements';

describe('getEditableElement', () => {
  test('should return an instance of InputElement for an HTMLInputElement', () => {
    const element = document.createElement('input');
    const editableElement = getEditableElement(element);

    expect(editableElement).toBeInstanceOf(InputElement);
  });

  test('should return an instance of InputElement for an HTMLTextAreaElement', () => {
    const element = document.createElement('textarea');
    const editableElement = getEditableElement(element);

    expect(editableElement).toBeInstanceOf(InputElement);
  });

  test('should return an instance of ContentEditableElement for a content editable element', () => {
    const element = createEditableDivElement('This is some editable text');
    const editableElement = getEditableElement(element);

    expect(editableElement).toBeInstanceOf(ContentEditableElement);
  });

  test('should return null for a password input element', () => {
    const element = document.createElement('input');
    element.setAttribute('type', 'password');
    const editableElement = getEditableElement(element);

    expect(editableElement).toBeNull();
  });

  test('should return an instance of LexicalElement for a Lexical editor element', () => {
    const element = createLexicalEditorElement('Some text');
    const editableElement = getEditableElement(element);

    expect(editableElement).toBeInstanceOf(LexicalElement);
  });

  test('should return an instance of LexicalElement for a child of a Lexical editor', () => {
    const container = document.createElement('div');
    container.setAttribute('data-lexical-editor', 'true');
    const child = document.createElement('p');
    child.contentEditable = 'true';
    patchElement(child);
    container.appendChild(child);
    document.body.appendChild(container);

    const editableElement = getEditableElement(child);

    expect(editableElement).toBeInstanceOf(LexicalElement);
    document.body.removeChild(container);
  });

  test('should return null for other HTML elements', () => {
    const element = document.createElement('div');
    const editableElement = getEditableElement(element);

    expect(editableElement).toBeNull();
  });
});

describe('InputElement', () => {
  let input: HTMLInputElement;
  let textarea: HTMLTextAreaElement;
  let inputElement: InputElement;
  let textareaElement: InputElement;

  beforeAll(() => {
    input = document.createElement('input');
    textarea = document.createElement('textarea');
    inputElement = new InputElement(input);
    textareaElement = new InputElement(textarea);
  });

  describe('extractText', () => {
    test('should return the value of an HTMLInputElement', () => {
      input.value = 'Hello World';
      const result = inputElement.extractText();
      expect(result).toBe('Hello World');
    });

    test('should return the value of an HTMLTextAreaElement', () => {
      textarea.value = 'Lorem ipsum dolor sit amet';
      const result = textareaElement.extractText();
      expect(result).toBe('Lorem ipsum dolor sit amet');
    });
  });

  describe('setText', () => {
    const newText = 'New Text';

    beforeEach(() => {
      input.value = '';
      textarea.value = '';
    });

    test('should set the value of an HTMLInputElement', () => {
      inputElement.setText(newText);
      expect(input.value).toBe(newText);
    });

    test('should set the value of an HTMLTextAreaElement', () => {
      textareaElement.setText(newText);
      expect(textarea.value).toBe(newText);
    });
  });
});

describe('ContentEditableElement', () => {
  let element: HTMLDivElement;
  let editableElement: ContentEditableElement;

  beforeEach(() => {
    element = createEditableDivElement('This is some editable text');
    editableElement = new ContentEditableElement(element);
  });

  describe('extractText', () => {
    interface TestCase {
      name: string;
      innerText: string;
      expected: string;
    }

    const testCases: TestCase[] = [
      {
        name: 'should return the innerText of a content editable element',
        innerText: 'This is some editable text',
        expected: 'This is some editable text',
      },
      {
        name: 'should replace duplicate newlines with a single newline',
        innerText: 'Line 1\n\nLine 2\nLine 3\n\n\nLine 4',
        expected: 'Line 1\nLine 2\nLine 3\nLine 4',
      },
      {
        name: 'should replace duplicate whitespace with a single space',
        innerText:
          '   This   is   some   text   with   duplicate   whitespace   ',
        expected: 'This is some text with duplicate whitespace',
      },
      {
        name: 'should return an empty string for other HTML elements',
        innerText: '',
        expected: '',
      },
    ];

    testCases.forEach(({ name, innerText, expected }) => {
      test(name, () => {
        element.innerText = innerText;
        const result = editableElement.extractText();
        expect(result).toBe(expected);
      });
    });
  });

  describe('setText', () => {
    test('should set the text of the content editable element', () => {
      const newText = 'This is some new text';
      editableElement.setText(newText);
      expect(element.innerText).toBe(newText);
    });
  });
});

describe('LexicalElement', () => {
  let element: HTMLDivElement;
  let lexicalElement: LexicalElement;

  beforeEach(() => {
    // JSDOM does not implement DataTransfer or ClipboardEvent, so we
    // polyfill them for testing.
    if (typeof globalThis.DataTransfer === 'undefined') {
      globalThis.DataTransfer = class DataTransfer {
        private data = new Map<string, string>();
        setData(format: string, value: string) {
          this.data.set(format, value);
        }
        getData(format: string) {
          return this.data.get(format) ?? '';
        }
      } as unknown as typeof globalThis.DataTransfer;
    }
    if (typeof globalThis.ClipboardEvent === 'undefined') {
      globalThis.ClipboardEvent = class ClipboardEvent extends Event {
        readonly clipboardData: DataTransfer | null;
        constructor(type: string, init?: ClipboardEventInit) {
          super(type, init);
          this.clipboardData =
            (init as { clipboardData?: DataTransfer })?.clipboardData ?? null;
        }
      } as unknown as typeof globalThis.ClipboardEvent;
    }

    element = createLexicalEditorElement('Initial text');
    document.body.appendChild(element);
    lexicalElement = new LexicalElement(element);
  });

  afterEach(() => {
    document.body.removeChild(element);
    jest.restoreAllMocks();
  });

  describe('extractText', () => {
    test('should normalize text the same way as ContentEditableElement', () => {
      element.innerText = 'Line 1\n\nLine 2\nLine 3\n\n\nLine 4';
      expect(lexicalElement.extractText()).toBe(
        'Line 1\nLine 2\nLine 3\nLine 4'
      );
    });

    test('should collapse duplicate whitespace', () => {
      element.innerText = '   Hello   world   ';
      expect(lexicalElement.extractText()).toBe('Hello world');
    });
  });

  describe('setText', () => {
    function getPasteEvents(spy: jest.SpyInstance): ClipboardEvent[] {
      return spy.mock.calls
        .map(([event]: [Event]) => event)
        .filter((e: Event): e is ClipboardEvent => e instanceof ClipboardEvent);
    }

    function getPastedText(event: ClipboardEvent): string | undefined {
      return event.clipboardData?.getData('text/plain');
    }

    test('should dispatch a paste ClipboardEvent with the text', () => {
      const dispatchSpy = jest.spyOn(element, 'dispatchEvent');

      lexicalElement.setText('Hello Lexical');

      const pasteEvents = getPasteEvents(dispatchSpy);
      expect(pasteEvents).toHaveLength(1);
      expect(getPastedText(pasteEvents[0])).toBe('Hello Lexical');
      expect(pasteEvents[0].bubbles).toBe(true);
      expect(pasteEvents[0].cancelable).toBe(true);
    });

    test('should select all content on the first call to replace the trigger text', () => {
      element.innerHTML = '';
      element.appendChild(document.createTextNode('Initial text'));

      const mockRange = {
        setStart: jest.fn(),
        setEnd: jest.fn(),
        selectNodeContents: jest.fn(),
      };
      const mockSelection = {
        removeAllRanges: jest.fn(),
        addRange: jest.fn(),
      };
      jest
        .spyOn(document, 'createRange')
        .mockReturnValue(mockRange as unknown as Range);
      jest
        .spyOn(window, 'getSelection')
        .mockReturnValue(mockSelection as unknown as Selection);

      lexicalElement.setText('Replacement text');

      expect(mockRange.setStart).toHaveBeenCalledWith(expect.any(Text), 0);
      expect(mockRange.setEnd).toHaveBeenCalledWith(
        expect.any(Text),
        'Initial text'.length
      );
      expect(mockRange.selectNodeContents).not.toHaveBeenCalled();
      expect(mockSelection.removeAllRanges).toHaveBeenCalled();
      expect(mockSelection.addRange).toHaveBeenCalledWith(mockRange);
    });

    test('should resolve to lexical root when constructed from a child element', () => {
      const child = document.createElement('span');
      child.textContent = 'Initial text';
      element.innerHTML = '';
      element.appendChild(child);

      const dispatchSpy = jest.spyOn(element, 'dispatchEvent');
      const lexicalFromChild = new LexicalElement(child);

      lexicalFromChild.setText('Root paste');

      const pasteEvents = getPasteEvents(dispatchSpy);
      expect(pasteEvents).toHaveLength(1);
      expect(getPastedText(pasteEvents[0])).toBe('Root paste');
    });

    test('should only paste the delta on subsequent calls', () => {
      const dispatchSpy = jest.spyOn(element, 'dispatchEvent');

      // Simulate streaming chunks: "Oh" → "Oh," → "Oh, hello"
      lexicalElement.setText('Oh');
      lexicalElement.setText('Oh,');
      lexicalElement.setText('Oh, hello');

      const pasteEvents = getPasteEvents(dispatchSpy);
      expect(pasteEvents).toHaveLength(3);
      expect(getPastedText(pasteEvents[0])).toBe('Oh');
      expect(getPastedText(pasteEvents[1])).toBe(',');
      expect(getPastedText(pasteEvents[2])).toBe(' hello');
    });

    test('should not call selectAll on subsequent calls', () => {
      const getSelectionSpy = jest.spyOn(window, 'getSelection');

      lexicalElement.setText('First');
      getSelectionSpy.mockClear();

      lexicalElement.setText('First chunk');

      expect(getSelectionSpy).not.toHaveBeenCalled();
    });

    test('should keep streaming as delta even if the prompt text remains in the editor', () => {
      const dispatchSpy = jest.spyOn(element, 'dispatchEvent');
      element.innerText = '/ai tell me what does the fox say';

      lexicalElement.setText('Sure');
      lexicalElement.setText('Sure thing!');

      const pasteEvents = getPasteEvents(dispatchSpy);
      expect(pasteEvents).toHaveLength(2);
      expect(getPastedText(pasteEvents[0])).toBe('Sure');
      expect(getPastedText(pasteEvents[1])).toBe(' thing!');
    });

    test('should preserve newlines in pasted text', () => {
      const dispatchSpy = jest.spyOn(element, 'dispatchEvent');

      lexicalElement.setText('Line 1\nLine 2\nLine 3');

      const pasteEvents = getPasteEvents(dispatchSpy);
      expect(pasteEvents).toHaveLength(1);
      expect(getPastedText(pasteEvents[0])).toBe('Line 1\nLine 2\nLine 3');
    });

    test('should handle newlines in streaming deltas', () => {
      const dispatchSpy = jest.spyOn(element, 'dispatchEvent');

      lexicalElement.setText('Hello');
      lexicalElement.setText('Hello\nWorld');

      const pasteEvents = getPasteEvents(dispatchSpy);
      expect(pasteEvents).toHaveLength(2);
      expect(getPastedText(pasteEvents[0])).toBe('Hello');
      expect(getPastedText(pasteEvents[1])).toBe('\nWorld');
    });

    test('should focus the element before modifying it', () => {
      const focusSpy = jest.spyOn(element, 'focus');

      lexicalElement.setText('Focused text');

      expect(focusSpy).toHaveBeenCalled();
    });
  });
});

function createLexicalEditorElement(innerText?: string): HTMLDivElement {
  const element = document.createElement('div');
  element.contentEditable = 'true';
  element.setAttribute('data-lexical-editor', 'true');
  patchElement(element);

  if (innerText) {
    element.innerText = innerText;
  }
  return element;
}

function createEditableDivElement(innerText?: string): HTMLDivElement {
  const element = document.createElement('div');
  element.contentEditable = 'true';
  patchElement(element);

  if (innerText) {
    element.innerText = innerText;
  }
  return element;
}

/**
 * Patches an HTMLDivElement to make it content editable.
 *
 * This is due the fact that, despite widespread browser support, JSDOM does
 * not support content editable elements.
 * https://github.com/jsdom/jsdom/issues/1670
 *
 * @param element - The HTMLDivElement to be patched.
 */
function patchElement(element: HTMLDivElement) {
  Object.defineProperty(element, 'isContentEditable', {
    value: true,
    writable: false, // Prevent overriding this property
    configurable: true,
  });
}
