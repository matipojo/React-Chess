import { getModelContext, ModelContextTool } from "../model-context-types";

export function registerModelContextTools(tools: ModelContextTool[]): () => void {
  const mc = getModelContext();
  if (!mc) {
    return () => undefined;
  }

  const toolNames = tools.map((tool) => tool.name);
  const registration = new AbortController();

  function cleanupTools() {
    registration.abort();
    const ctx = getModelContext();
    if (!ctx) {
      return;
    }
    if (typeof ctx.clearContext === "function") {
      ctx.clearContext();
      return;
    }
    if (typeof ctx.unregisterTool === "function") {
      for (const name of toolNames) {
        try {
          ctx.unregisterTool(name);
        } catch {
          // Already unregistered or unsupported in this snapshot of the API.
        }
      }
    }
  }

  if (typeof mc.provideContext === "function") {
    mc.provideContext({ tools });
    return cleanupTools;
  }

  if (typeof mc.registerTool === "function") {
    for (const tool of tools) {
      if (typeof mc.unregisterTool === "function") {
        try {
          mc.unregisterTool(tool.name);
        } catch {
          // ignore duplicate-unregister failures
        }
      }
      void Promise.resolve(mc.registerTool(tool, { signal: registration.signal })).catch(() => {
        // Duplicate names, aborted Strict Mode remounts, or unsupported snapshots.
      });
    }
    return cleanupTools;
  }

  return () => undefined;
}
