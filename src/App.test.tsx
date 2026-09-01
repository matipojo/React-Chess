import { render } from "@testing-library/react";
import App from "./App";

describe("App routes", () => {
  afterEach(() => {
    window.location.hash = "";
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
});
