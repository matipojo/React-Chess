export const DEMO_START_MESSAGE = "start-demo";

export type DemoStartMessage = { type: typeof DEMO_START_MESSAGE };

export function isDemoStartMessage(data: unknown): data is DemoStartMessage {
  return Boolean(
    data &&
      typeof data === "object" &&
      (data as DemoStartMessage).type === DEMO_START_MESSAGE
  );
}

export function isEmbeddedWindow(win: Window = window): boolean {
  try {
    return win.parent !== win;
  } catch {
    return true;
  }
}

/** Run a shared demo immediately on a top-level page, or when an embedder posts start-demo. */
export function whenDemoShouldStart(
  run: () => void,
  options?: { topLevelDelayMs?: number; isEmbedded?: boolean }
): () => void {
  let started = false;
  const start = () => {
    if (started) {
      return;
    }
    started = true;
    run();
  };

  const onMessage = (event: MessageEvent) => {
    if (isDemoStartMessage(event.data)) {
      start();
    }
  };
  window.addEventListener("message", onMessage);

  const embedded = options?.isEmbedded ?? isEmbeddedWindow();
  let timer = 0;
  if (!embedded) {
    const delay = options?.topLevelDelayMs ?? 0;
    if (delay > 0) {
      timer = window.setTimeout(start, delay);
    } else {
      start();
    }
  }

  return () => {
    window.removeEventListener("message", onMessage);
    if (timer) {
      window.clearTimeout(timer);
    }
  };
}
