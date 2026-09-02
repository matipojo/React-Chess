import { ModelContext, ModelContextTool, whenModelContextAvailable } from "../model-context-types";

function bindModelContextTools(mc: ModelContext, tools: ModelContextTool[]): () => void {
  const toolNames = tools.map((tool) => tool.name);
  const registration = new AbortController();

  function cleanupTools() {
    registration.abort();
    if (typeof mc.clearContext === "function") {
      mc.clearContext();
      return;
    }
    if (typeof mc.unregisterTool === "function") {
      for (const name of toolNames) {
        try {
          mc.unregisterTool(name);
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

export function registerModelContextTools(tools: ModelContextTool[]): () => void {
  let unbind = () => undefined;
  const stopWait = whenModelContextAvailable((mc) => {
    unbind();
    unbind = bindModelContextTools(mc, tools);
  });
  return () => {
    stopWait();
    unbind();
  };
}
