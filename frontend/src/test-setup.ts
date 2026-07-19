import '@testing-library/jest-dom/vitest';

// jsdom does not implement ResizeObserver, which Ant Design's TextArea
// and other components depend on. Provide a stub so tests don't crash.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// jsdom does not implement window.matchMedia, which Ant Design's
// responsive observer uses for breakpoint detection.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},  // deprecated, but Ant Design may still reference it
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
