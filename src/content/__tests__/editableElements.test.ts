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
  let execCommandMock: jest.Mock;

  beforeEach(() => {
    // JSDOM does not implement execCommand, so we polyfill it for testing.
    execCommandMock = jest.fn().mockReturnValue(false);
    document.execCommand = execCommandMock;

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
    test('should use execCommand to insert text through the editing pipeline', () => {
      execCommandMock.mockReturnValue(true);

      lexicalElement.setText('Hello Lexical');

      expect(execCommandMock).toHaveBeenCalledWith(
        'insertText',
        false,
        'Hello Lexical'
      );
    });

    test('should select all content on the first call to replace the trigger text', () => {
      const mockRange = {
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
      execCommandMock.mockReturnValue(true);

      lexicalElement.setText('Replacement text');

      expect(mockRange.selectNodeContents).toHaveBeenCalledWith(element);
      expect(mockSelection.removeAllRanges).toHaveBeenCalled();
      expect(mockSelection.addRange).toHaveBeenCalledWith(mockRange);
    });

    test('should only insert the delta on subsequent calls', () => {
      execCommandMock.mockReturnValue(true);

      // Simulate streaming chunks: "Oh" → "Oh," → "Oh, hello"
      lexicalElement.setText('Oh');
      lexicalElement.setText('Oh,');
      lexicalElement.setText('Oh, hello');

      expect(execCommandMock).toHaveBeenCalledTimes(3);
      expect(execCommandMock).toHaveBeenNthCalledWith(
        1,
        'insertText',
        false,
        'Oh'
      );
      expect(execCommandMock).toHaveBeenNthCalledWith(
        2,
        'insertText',
        false,
        ','
      );
      expect(execCommandMock).toHaveBeenNthCalledWith(
        3,
        'insertText',
        false,
        ' hello'
      );
    });

    test('should not call selectAll on subsequent calls', () => {
      const getSelectionSpy = jest.spyOn(window, 'getSelection');
      execCommandMock.mockReturnValue(true);

      lexicalElement.setText('First');
      getSelectionSpy.mockClear();

      lexicalElement.setText('First chunk');

      expect(getSelectionSpy).not.toHaveBeenCalled();
    });

    test('should use insertParagraph for newlines in text', () => {
      execCommandMock.mockReturnValue(true);

      lexicalElement.setText('Line 1\nLine 2\nLine 3');

      expect(execCommandMock).toHaveBeenCalledWith(
        'insertText',
        false,
        'Line 1'
      );
      expect(execCommandMock).toHaveBeenCalledWith(
        'insertParagraph',
        false,
        ''
      );
      expect(execCommandMock).toHaveBeenCalledWith(
        'insertText',
        false,
        'Line 2'
      );
      expect(execCommandMock).toHaveBeenCalledWith(
        'insertText',
        false,
        'Line 3'
      );
    });

    test('should handle newlines in streaming deltas', () => {
      execCommandMock.mockReturnValue(true);

      // First chunk: no newline
      lexicalElement.setText('Hello');
      // Second chunk: includes a newline
      lexicalElement.setText('Hello\nWorld');

      // First call: insertText "Hello"
      expect(execCommandMock).toHaveBeenNthCalledWith(
        1,
        'insertText',
        false,
        'Hello'
      );
      // Second call delta is "\nWorld": insertParagraph, then insertText "World"
      expect(execCommandMock).toHaveBeenNthCalledWith(
        2,
        'insertParagraph',
        false,
        ''
      );
      expect(execCommandMock).toHaveBeenNthCalledWith(
        3,
        'insertText',
        false,
        'World'
      );
    });

    test('should handle consecutive newlines for empty paragraphs', () => {
      execCommandMock.mockReturnValue(true);

      lexicalElement.setText('A\n\nB');

      expect(execCommandMock).toHaveBeenCalledTimes(4);
      expect(execCommandMock).toHaveBeenNthCalledWith(
        1,
        'insertText',
        false,
        'A'
      );
      expect(execCommandMock).toHaveBeenNthCalledWith(
        2,
        'insertParagraph',
        false,
        ''
      );
      expect(execCommandMock).toHaveBeenNthCalledWith(
        3,
        'insertParagraph',
        false,
        ''
      );
      expect(execCommandMock).toHaveBeenNthCalledWith(
        4,
        'insertText',
        false,
        'B'
      );
    });

    test('should focus the element before modifying it', () => {
      const focusSpy = jest.spyOn(element, 'focus');
      execCommandMock.mockReturnValue(true);

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
