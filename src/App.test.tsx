import { act, render } from "@testing-library/react";
import App from "./App";
import { ModelContextTool } from "./model-context-types";
import { CHESS_PATH, TRIANGLES_PATH } from "./utils/appRoute";

function setPath(path: string) {
  window.history.pushState({}, "", path);
}

describe("App routes", () => {
  afterEach(() => {
    setPath("/");
    delete (document as { modelContext?: unknown }).modelContext;
  });

  it("shows the chess app by default", () => {
    setPath("/");
    const { getByRole, container, unmount } = render(<App />);
    expect(getByRole("heading", { name: "Generative Learning" })).toBeTruthy();
    expect(getByRole("link", { name: "About" }).getAttribute("href")).toBe("/about");
    expect(getByRole("link", { name: "Chess" }).getAttribute("href")).toBe(CHESS_PATH);
    expect(getByRole("link", { name: "Triangles" }).getAttribute("href")).toBe(
      TRIANGLES_PATH
    );
    expect(container.querySelector("#chessboard")).toBeTruthy();
    expect(container.querySelector(".geometry-canvas")).toBeNull();
    unmount();
  });

  it("shows the triangle surface at /triangles without a chessboard", () => {
    setPath("/triangles");
    const { getByRole, container, unmount } = render(<App />);
    expect(getByRole("heading", { name: "Generative Learning" })).toBeTruthy();
    expect(getByRole("link", { name: "Triangles" }).getAttribute("aria-current")).toBe(
      "page"
    );
    expect(container.querySelector(".geometry-canvas")).toBeTruthy();
    expect(container.querySelector("#chessboard")).toBeNull();
    unmount();
  });

  it("shows the about page at /about", () => {
    setPath("/about");
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
    setPath("/about");
    const { findByRole, queryByText } = render(<App />);
    expect(queryByText("Not the canvas.")).toBeTruthy();
    const openPage = registered.find((tool) => tool.name === "open-page");
    expect(openPage).toBeTruthy();
    await act(async () => {
      await openPage!.execute({ page: "chess" });
    });
    expect(await findByRole("heading", { name: "Generative Learning" })).toBeTruthy();
    expect(queryByText("Not the canvas.")).toBeNull();
  });
});
