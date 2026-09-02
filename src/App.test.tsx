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

  it("shows the home page by default", () => {
    setPath("/");
    const { getByRole, container, unmount } = render(<App />);
    expect(getByRole("heading", { name: /Personalize the lesson endlessly/ })).toBeTruthy();
    expect(getByRole("link", { name: "Generative Learning" }).getAttribute("href")).toBe("/");
    const nav = getByRole("navigation", { name: "Learning surfaces" });
    expect(nav.querySelector(".about-subnav-chess")?.getAttribute("href")).toBe(CHESS_PATH);
    expect(nav.querySelector(".about-subnav-triangles")?.getAttribute("href")).toBe(
      TRIANGLES_PATH
    );
    expect(container.querySelector("#chessboard")).toBeTruthy();
    expect(container.querySelector(".geometry-canvas")).toBeTruthy();
    unmount();
  });

  it("shows the chess app at /chess", () => {
    setPath("/chess");
    const { getByRole, container, unmount } = render(<App />);
    expect(getByRole("heading", { name: "Generative Learning" })).toBeTruthy();
    expect(getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/");
    expect(getByRole("link", { name: "Chess" }).getAttribute("aria-current")).toBe("page");
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

  it("treats /about as the home page", () => {
    setPath("/about");
    const { getByRole, unmount } = render(<App />);
    expect(getByRole("heading", { name: /Personalize the lesson endlessly/ })).toBeTruthy();
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
    setPath("/");
    const { findByRole, queryByRole } = render(<App />);
    expect(queryByRole("heading", { name: /Personalize the lesson endlessly/ })).toBeTruthy();
    const openPage = registered.find((tool) => tool.name === "open-page");
    expect(openPage).toBeTruthy();
    await act(async () => {
      await openPage!.execute({ page: "chess" });
    });
    expect(await findByRole("heading", { name: "Generative Learning" })).toBeTruthy();
    expect(queryByRole("heading", { name: /Personalize the lesson endlessly/ })).toBeNull();
  });
});
