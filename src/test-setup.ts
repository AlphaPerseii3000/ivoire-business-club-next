import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock IntersectionObserver as a class for JSDOM / Next.js link compatibility
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

if (typeof global !== 'undefined') {
  global.IntersectionObserver = MockIntersectionObserver as any;
}

// Mock window.matchMedia for prefers-reduced-motion media queries
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Minimal DOM geometry polyfills for TipTap / ProseMirror in JSDOM.
if (typeof window !== 'undefined' && !window.getSelection) {
  Object.defineProperty(window, 'getSelection', {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue({
      rangeCount: 0,
      getRangeAt: vi.fn(),
      removeAllRanges: vi.fn(),
      addRange: vi.fn(),
      collapse: vi.fn(),
      collapseToEnd: vi.fn(),
      extend: vi.fn(),
      anchorNode: null,
      focusNode: null,
      isCollapsed: true,
    }),
  });
}

if (typeof document !== 'undefined' && !document.createRange) {
  Object.defineProperty(document, 'createRange', {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue({
      setStart: vi.fn(),
      setEnd: vi.fn(),
      collapse: vi.fn(),
      commonAncestorContainer: document.body,
      cloneRange: vi.fn().mockReturnThis(),
      cloneContents: vi.fn().mockReturnValue(document.createDocumentFragment()),
      insertNode: vi.fn(),
      deleteContents: vi.fn(),
      extractContents: vi.fn().mockReturnValue(document.createDocumentFragment()),
      getBoundingClientRect: vi.fn().mockReturnValue(new DOMRect(0, 0, 0, 0)),
      getClientRects: vi.fn().mockReturnValue([]),
    }),
  });
}

if (typeof document !== 'undefined' && !document.elementFromPoint) {
  Object.defineProperty(document, 'elementFromPoint', {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue(null),
  });
}

if (typeof Range !== 'undefined' && !Range.prototype.getClientRects) {
  Object.defineProperty(Range.prototype, 'getClientRects', {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue([]),
  });
}

if (typeof Range !== 'undefined' && !Range.prototype.getBoundingClientRect) {
  Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue(new DOMRect(0, 0, 0, 0)),
  });
}

if (typeof window !== 'undefined' && !window.DOMRect) {
  Object.defineProperty(window, 'DOMRect', {
    writable: true,
    configurable: true,
    value: class DOMRect {
      x = 0;
      y = 0;
      width = 0;
      height = 0;
      top = 0;
      right = 0;
      bottom = 0;
      left = 0;
      constructor(x = 0, y = 0, width = 0, height = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.top = y;
        this.right = x + width;
        this.bottom = y + height;
        this.left = x;
      }
      static fromRect(rect?: { x?: number; y?: number; width?: number; height?: number }) {
        return new DOMRect(rect?.x, rect?.y, rect?.width, rect?.height);
      }
      toJSON() {
        return { x: this.x, y: this.y, width: this.width, height: this.height, top: this.top, right: this.right, bottom: this.bottom, left: this.left };
      }
    },
  });
}

// ProseMirror may try to focus the editor content element during transactions.
// Stub focus/blur safely so JSDOM does not throw when the document is not focused.
if (typeof HTMLElement !== 'undefined' && HTMLElement.prototype.focus) {
  const originalFocus = HTMLElement.prototype.focus;
  Object.defineProperty(HTMLElement.prototype, 'focus', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation(function (this: HTMLElement, options?: FocusOptions) {
      try {
        return originalFocus.call(this, options);
      } catch {
        // ignore focus errors in JSDOM
      }
    }),
  });
}

if (typeof HTMLElement !== 'undefined' && HTMLElement.prototype.blur) {
  const originalBlur = HTMLElement.prototype.blur;
  Object.defineProperty(HTMLElement.prototype, 'blur', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation(function (this: HTMLElement) {
      try {
        return originalBlur.call(this);
      } catch {
        // ignore blur errors in JSDOM
      }
    }),
  });
}
