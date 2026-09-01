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

export type { ModelContextTool, ToolResponse };
