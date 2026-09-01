import { render } from "@testing-library/react";
import App from "./App";
import { ModelContextTool } from "./model-context-types";

describe("App routes", () => {
  afterEach(() => {
    window.location.hash = "";
    delete (document as { modelContext?: unknown }).modelContext;
  });

  it("shows the chess app by default", () => {
    window.location.hash = "";
    const { getByRole, unmount } = render(<App />);
    expect(getByRole("heading", { name: "Generative Learning" })).toBeTruthy();
    expect(getByRole("link", { name: "About" }).getAttribute("href")).toBe(
      "#/about"
    );
    unmount();
  });

  it("shows the about page at #/about", () => {
    window.location.hash = "#/about";
    const { getByText, queryByRole, unmount } = render(<App />);
    expect(getByText("Not the canvas.")).toBeTruthy();
    expect(queryByRole("heading", { name: "Generative Learning" })).toBeNull();
    unmount();
  });

  it("lets home-page agent tools open the chess app", async () => {
    const registered: ModelContextTool[] = [];
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        provideContext: ({ tools }: { tools: ModelContextTool[] }) => {
          registered.splice(0, registered.length, ...tools);
        },
        clearContext: () => {
          registered.length = 0;
        },
      },
    });
    window.location.hash = "#/about";
    const { findByRole, queryByText } = render(<App />);
    expect(queryByText("Not the canvas.")).toBeTruthy();
    const openPage = registered.find((tool) => tool.name === "open-page");
    expect(openPage).toBeTruthy();
    await openPage!.execute({ page: "chess" });
    expect(await findByRole("heading", { name: "Generative Learning" })).toBeTruthy();
    expect(queryByText("Not the canvas.")).toBeNull();
  });
});
