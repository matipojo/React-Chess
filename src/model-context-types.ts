type ModelContextTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (params: Record<string, unknown>) => Promise<unknown>;
};

type ModelContext = {
  provideContext?: (context: { tools: ModelContextTool[] }) => void;
  registerTool?: (tool: ModelContextTool) => void | { unregister?: () => void };
  unregisterTool?: (name: string) => void;
  clearContext?: () => void;
};

declare global {
  interface Navigator {
    modelContext?: ModelContext;
  }
}

export type { ModelContextTool };
