export type ToolResponse = {
  success: boolean;
  message: string;
  data: unknown;
};

type ModelContextTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (
    params: Record<string, unknown>,
    options?: { signal?: AbortSignal }
  ) => Promise<unknown>;
};

type ModelContextRegisterToolOptions = {
  signal?: AbortSignal;
};

type ModelContext = {
  provideContext?: (context: { tools: ModelContextTool[] }) => void;
  registerTool?: (
    tool: ModelContextTool,
    options?: ModelContextRegisterToolOptions
  ) => void | Promise<void> | { unregister?: () => void };
  unregisterTool?: (name: string) => void | Promise<void>;
  clearContext?: () => void;
};

declare global {
  interface Document {
    modelContext?: ModelContext;
  }

  interface Navigator {
    /** @deprecated Use document.modelContext instead. */
    modelContext?: ModelContext;
  }
}

export function getModelContext(): ModelContext | undefined {
  return document.modelContext ?? navigator.modelContext;
}

const MODEL_CONTEXT_WAIT_MS = 20000;
const MODEL_CONTEXT_POLL_MS = 200;

/**
 * ChatGPT/Codex may inject document.modelContext after the first React paint.
 * Register immediately when it exists; otherwise keep watching for a short window.
 */
export function whenModelContextAvailable(
  onReady: (mc: ModelContext) => void
): () => void {
  let stopped = false;
  let delivered = false;

  const run = () => {
    if (stopped || delivered) {
      return;
    }
    const mc = getModelContext();
    if (!mc) {
      return;
    }
    delivered = true;
    onReady(mc);
  };

  run();
  if (delivered || stopped || typeof window === "undefined") {
    return () => {
      stopped = true;
    };
  }

  const onEvent = () => run();
  window.addEventListener("modelcontextready", onEvent);

  const isTest = typeof process !== "undefined" && process.env.NODE_ENV === "test";
  let timer: number | undefined;
  let timeout: number | undefined;
  if (!isTest) {
    timer = window.setInterval(run, MODEL_CONTEXT_POLL_MS);
    timeout = window.setTimeout(() => {
      if (timer !== undefined) {
        window.clearInterval(timer);
      }
    }, MODEL_CONTEXT_WAIT_MS);
  }

  return () => {
    stopped = true;
    if (timer !== undefined) {
      window.clearInterval(timer);
    }
    if (timeout !== undefined) {
      window.clearTimeout(timeout);
    }
    window.removeEventListener("modelcontextready", onEvent);
  };
}

export type { ModelContext, ModelContextTool, ToolResponse };
