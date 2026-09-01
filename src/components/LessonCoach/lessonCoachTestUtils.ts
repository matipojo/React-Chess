export function mockUserAgent(userAgent: string): () => void {
  const original = navigator.userAgent;
  Object.defineProperty(navigator, "userAgent", {
    configurable: true,
    get: () => userAgent,
  });
  return () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () => original,
    });
  };
}

export function mockWindowOpen() {
  const open = jest.fn().mockReturnValue({});
  const originalOpen = window.open;
  window.open = open;
  return {
    open,
    restore() {
      window.open = originalOpen;
    },
  };
}
