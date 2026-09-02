import { act, render } from "@testing-library/react";
import App from "./App";
import { ModelContextTool } from "./model-context-types";
import { CHESS_PATH, TRIANGLES_PATH } from "./utils/appRoute";

function setPath(path: string) {
  window.history.pushState({}, "", path);
}

function faviconHref() {
  return document.querySelector("link[rel='icon']")?.getAttribute("href") || "";
}

describe("App routes", () => {
  afterEach(() => {
    setPath("/");
    document.title = "";
    document.querySelectorAll("link[rel='icon'], link[rel='shortcut icon']").forEach((el) => {
      el.parentNode?.removeChild(el);
    });
    delete (document as { modelContext?: unknown }).modelContext;
  });

  it("shows the home page by default", () => {
    setPath("/");
    const { getByRole, container, unmount } = render(<App />);
    expect(getByRole("heading", { name: /Not the canvas/ })).toBeTruthy();
    expect(getByRole("link", { name: "Generative Learning" }).getAttribute("href")).toBe("/");
    const nav = getByRole("navigation", { name: "Learning surfaces" });
    expect(nav.querySelector(".about-subnav-chess")?.getAttribute("href")).toBe(CHESS_PATH);
    expect(nav.querySelector(".about-subnav-triangles")?.getAttribute("href")).toBe(
      TRIANGLES_PATH
    );
    expect(container.querySelector("#chessboard")).toBeTruthy();
    expect(container.querySelector(".geometry-canvas")).toBeTruthy();
    expect(document.title).toBe("Generative Learning");
    expect(faviconHref()).toMatch(/favicon-home\.svg$/);
    expect(faviconHref()).not.toMatch(/chess/i);
    unmount();
  });

  it("shows the chess app at /chess", () => {
    setPath("/chess");
    const { getByRole, container, unmount } = render(<App />);
    expect(getByRole("heading", { name: "Generative Learning" })).toBeTruthy();
    expect(getByRole("link", { name: "Generative Learning" }).getAttribute("href")).toBe("/");
    expect(getByRole("link", { name: "Chess" }).getAttribute("aria-current")).toBe("page");
    expect(container.querySelector("#chessboard")).toBeTruthy();
    expect(container.querySelector(".geometry-canvas")).toBeNull();
    expect(document.title).toBe("Chess · Generative Learning");
    expect(faviconHref()).toMatch(/favicon-chess\.svg$/);
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
    expect(document.title).toBe("Triangles · Generative Learning");
    expect(faviconHref()).toMatch(/favicon-triangles\.svg$/);
    expect(faviconHref()).not.toMatch(/chess/i);
    unmount();
  });

  it("treats /about as the home page", () => {
    setPath("/about");
    const { getByRole, unmount } = render(<App />);
    expect(getByRole("heading", { name: /Not the canvas/ })).toBeTruthy();
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
    expect(queryByRole("heading", { name: /Not the canvas/ })).toBeTruthy();
    const openPage = registered.find((tool) => tool.name === "open-page");
    expect(openPage).toBeTruthy();
    await act(async () => {
      await openPage!.execute({ page: "chess" });
    });
    expect(await findByRole("heading", { name: "Generative Learning" })).toBeTruthy();
    expect(queryByRole("heading", { name: /Not the canvas/ })).toBeNull();
    expect(document.title).toBe("Chess · Generative Learning");
    expect(faviconHref()).toMatch(/favicon-chess\.svg$/);
  });

  it("lets home-page agent tools open triangles with its own favicon", async () => {
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
    expect(faviconHref()).toMatch(/favicon-home\.svg$/);
    const openPage = registered.find((tool) => tool.name === "open-page");
    expect(openPage).toBeTruthy();
    await act(async () => {
      await openPage!.execute({ page: "triangles" });
    });
    expect(await findByRole("heading", { name: "Generative Learning" })).toBeTruthy();
    expect(queryByRole("heading", { name: /Not the canvas/ })).toBeNull();
    expect(document.title).toBe("Triangles · Generative Learning");
    expect(faviconHref()).toMatch(/favicon-triangles\.svg$/);
    expect(faviconHref()).not.toMatch(/chess/i);
  });
});
