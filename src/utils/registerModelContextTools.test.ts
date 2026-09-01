import { ModelContextTool } from "../model-context-types";
import { registerModelContextTools } from "./registerModelContextTools";

describe("registerModelContextTools", () => {
  afterEach(() => {
    delete (document as { modelContext?: unknown }).modelContext;
  });

  it("provides tools and clears them on cleanup", () => {
    const provided: ModelContextTool[] = [];
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        provideContext: ({ tools }: { tools: ModelContextTool[] }) => {
          provided.splice(0, provided.length, ...tools);
        },
        clearContext: () => {
          provided.length = 0;
        },
      },
    });
    const tool: ModelContextTool = {
      name: "list-pages",
      description: "demo",
      inputSchema: { type: "object", properties: {} },
      execute: async () => "ok",
    };
    const cleanup = registerModelContextTools([tool]);
    expect(provided).toEqual([tool]);
    cleanup();
    expect(provided).toEqual([]);
  });

  it("registers with AbortSignal when provideContext is unavailable", () => {
    const registered: string[] = [];
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        registerTool: (tool: ModelContextTool, options?: { signal?: AbortSignal }) => {
          registered.push(tool.name);
          options?.signal?.addEventListener("abort", () => {
            registered.splice(registered.indexOf(tool.name), 1);
          });
        },
      },
    });
    const cleanup = registerModelContextTools([
      {
        name: "open-page",
        description: "demo",
        inputSchema: { type: "object", properties: {} },
        execute: async () => "ok",
      },
    ]);
    expect(registered).toEqual(["open-page"]);
    cleanup();
    expect(registered).toEqual([]);
  });
});
