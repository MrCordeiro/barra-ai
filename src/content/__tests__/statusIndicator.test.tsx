import { act } from '@testing-library/react';
import { createStatusIndicator } from '../statusIndicator';

const HOST_ID = 'barra-ai-status-host';

// Chakra's color-mode provider calls window.matchMedia; jsdom doesn't ship it.
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
});

function makeAnchor(rect: Partial<DOMRect> = {}): HTMLElement {
  const el = document.createElement('textarea');
  document.body.appendChild(el);
  jest.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    top: 100,
    right: 400,
    bottom: 140,
    left: 200,
    width: 200,
    height: 40,
    x: 200,
    y: 100,
    toJSON: () => ({}),
    ...rect,
  } as DOMRect);
  return el;
}

function getHost(): HTMLElement | null {
  return document.getElementById(HOST_ID);
}

describe('createStatusIndicator', () => {
  afterEach(() => {
    document.getElementById(HOST_ID)?.remove();
  });

  test('show() mounts a host with a shadow root containing the loading copy', () => {
    const indicator = createStatusIndicator();
    const anchor = makeAnchor();

    act(() => {
      indicator.show(anchor);
    });

    const host = getHost();
    expect(host).not.toBeNull();
    expect(host!.shadowRoot).not.toBeNull();
    expect(host!.shadowRoot!.textContent).toContain('Thinking');
  });

  test('show() renders a Chakra Spinner inside the shadow root', () => {
    const indicator = createStatusIndicator();
    const anchor = makeAnchor();

    act(() => {
      indicator.show(anchor);
    });

    const spinner = getHost()!.shadowRoot!.querySelector('.chakra-spinner');
    expect(spinner).not.toBeNull();
  });

  test('show() positions the pill using the anchor rect', () => {
    const indicator = createStatusIndicator();
    const anchor = makeAnchor({ top: 250, right: 600 });

    act(() => {
      indicator.show(anchor);
    });

    const pill = getHost()!.shadowRoot!.querySelector<HTMLElement>(
      '[data-testid="barra-ai-pill"]'
    );
    expect(pill).not.toBeNull();
    expect(pill!.style.top).toMatch(/^\d+px$/);
    expect(pill!.style.left).toMatch(/^\d+px$/);
  });

  test('show() is idempotent — a second call does not create a second host', () => {
    const indicator = createStatusIndicator();
    const anchor = makeAnchor();

    act(() => {
      indicator.show(anchor);
      indicator.show(anchor);
    });

    expect(document.querySelectorAll(`#${HOST_ID}`)).toHaveLength(1);
  });

  test('hide() removes the host node', () => {
    const indicator = createStatusIndicator();
    const anchor = makeAnchor();

    act(() => {
      indicator.show(anchor);
    });
    expect(getHost()).not.toBeNull();

    act(() => {
      indicator.hide();
    });
    expect(getHost()).toBeNull();
  });

  test('hide() is safe to call before any show()', () => {
    const indicator = createStatusIndicator();
    expect(() => indicator.hide()).not.toThrow();
    expect(getHost()).toBeNull();
  });

  test('hide() removes the scroll and resize viewport listeners', () => {
    const indicator = createStatusIndicator();
    const anchor = makeAnchor();
    const removeSpy = jest.spyOn(window, 'removeEventListener');

    act(() => {
      indicator.show(anchor);
    });
    act(() => {
      indicator.hide();
    });

    const removed = removeSpy.mock.calls.map(([type]) => type);
    expect(removed).toEqual(expect.arrayContaining(['scroll', 'resize']));
  });

  test('show() can be called again after hide() to remount the indicator', () => {
    const indicator = createStatusIndicator();
    const anchor = makeAnchor();

    act(() => {
      indicator.show(anchor);
    });
    act(() => {
      indicator.hide();
    });
    act(() => {
      indicator.show(anchor);
    });

    expect(getHost()).not.toBeNull();
    expect(getHost()!.shadowRoot!.textContent).toContain('Thinking');
  });
});
