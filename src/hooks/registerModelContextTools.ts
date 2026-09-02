import { ModelContextTool } from "../model-context-types";
import { logLessonDebug } from "../lessons/debugLog";
import { compactToolResult } from "../lessons/debugSnapshot";
import { compactImageParam } from "../utils/pageBackground";
import { registerModelContextTools as bindPageTools } from "../utils/registerModelContextTools";

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

  return bindPageTools(wrappedTools);
}
