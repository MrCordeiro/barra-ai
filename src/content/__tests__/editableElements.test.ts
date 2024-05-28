import {
  getEditableElement,
  ContentEditableElement,
  InputElement,
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
