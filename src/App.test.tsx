import { render } from "@testing-library/react";
import App from "./App";
import { CHESS_PATH, TRIANGLES_PATH } from "./utils/appRoute";

function setPath(path: string) {
  window.history.pushState({}, "", path);
}

describe("App routes", () => {
  afterEach(() => {
    setPath("/");
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
});
