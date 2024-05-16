import { extractTextFromElement, setTextToElement } from '../textExtractor';

describe('extractTextFromElement', () => {
  test('should return the value of an HTMLInputElement', () => {
    const element = document.createElement('input');
    element.value = 'Hello World';

    const result = extractTextFromElement(element);

    expect(result).toBe('Hello World');
  });

  test('should return the value of an HTMLTextAreaElement', () => {
    const element = document.createElement('textarea');
    element.value = 'Lorem ipsum dolor sit amet';

    const result = extractTextFromElement(element);

    expect(result).toBe('Lorem ipsum dolor sit amet');
  });

  const testCases = [
    {
      name: 'return the innerText of a content editable element',
      innerText: 'This is some editable text',
      expected: 'This is some editable text',
    },
    {
      name: 'replace duplicate newlines with a single newline',
      innerText: 'Line 1\n\nLine 2\nLine 3\n\n\nLine 4',
      expected: 'Line 1\nLine 2\nLine 3\nLine 4',
    },
    {
      name: 'replace duplicate whitespace with a single space',
      innerText:
        '   This   is   some   text   with   duplicate   whitespace   ',
      expected: 'This is some text with duplicate whitespace',
    },
    {
      name: 'return an empty string for other HTML elements',
      innerText: '',
      expected: '',
    },
  ];

  testCases.forEach(({ name, innerText, expected }) => {
    test(name, () => {
      const element = createDivElement(innerText);
      const result = extractTextFromElement(element);
      expect(result).toBe(expected);
    });
  });
});

describe('setTextToElement', () => {
  test('should set the value of an HTMLInputElement', () => {
    const element = document.createElement('input');
    const newText = 'Hello World';

    setTextToElement(newText, element);

    expect(element.value).toBe(newText);
  });

  test('should set the value of an HTMLTextAreaElement', () => {
    const element = document.createElement('textarea');
    const newText = 'Lorem ipsum dolor sit amet';

    setTextToElement(newText, element);

    expect(element.value).toBe(newText);
  });

  test('should set the text content of a content editable element', () => {
    const element = createDivElement('/ai Replace this text');
    const newText = 'This is some new text';

    setTextToElement(newText, element);

    expect(element.innerText).toBe(newText);
  });
});

function createDivElement(innerText?: string): HTMLDivElement {
  const element = document.createElement('div');
  if (!innerText) {
    return element;
  }
  element.contentEditable = 'true';
  element.innerText = innerText;
  patchElement(element);
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
