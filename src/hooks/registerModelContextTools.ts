import { getModelContext, ModelContextTool } from "../model-context-types";
import { logLessonDebug } from "../lessons/debugLog";
import { compactToolResult } from "../lessons/debugSnapshot";
import { compactImageParam } from "../utils/pageBackground";

export type ToolResponse = {
  success: boolean;
  message: string;
  data: unknown;
};

export type RegisteredTool = ModelContextTool;

function compactToolParams(params: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const key of Object.keys(params)) {
    next[key] = compactImageParam(params[key]);
  }
  return next;
}

export function registerModelContextTools(
  tools: RegisteredTool[],
  longRunningNames: string[] = []
): () => void {
  const mc = getModelContext();
  if (!mc) {
    return () => undefined;
  }

  const toolNames = tools.map((tool) => tool.name);
  const longRunning = new Set(longRunningNames);
  const wrappedTools = tools.map((tool) => ({
    ...tool,
    execute: async (
      params: Record<string, unknown>,
      options?: { signal?: AbortSignal }
    ): Promise<unknown> => {
      const started = Date.now();
      if (longRunning.has(tool.name)) {
        logLessonDebug("tool", tool.name, {
          phase: "start",
          params: compactToolParams(params || {}),
        });
      }
        try {
          const result = await tool.execute(params, options);
          const payload =
            result && typeof result === "object"
              ? (result as { success?: boolean; message?: string; data?: unknown })
              : null;
          logLessonDebug("tool", tool.name, {
            durationMs: Date.now() - started,
            params: compactToolParams(params || {}),
            ...(payload && typeof payload.success === "boolean" && typeof payload.message === "string"
              ? compactToolResult({
                  success: payload.success,
                  message: payload.message,
                  data: payload.data,
                })
              : { result }),
          });
          return result;
      } catch (error) {
        logLessonDebug("tool", tool.name, {
          phase: "error",
          durationMs: Date.now() - started,
          params: compactToolParams(params || {}),
          error: `${error}`,
        });
        throw error;
      }
    },
  }));
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
    mc.provideContext({ tools: wrappedTools });
  } else if (typeof mc.registerTool === "function") {
    for (const tool of wrappedTools) {
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
  } else {
    return () => undefined;
  }

  return cleanupTools;
}
