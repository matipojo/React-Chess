import { render, waitFor } from "@testing-library/react";
import ChangeBackgroundButton from "./ChangeBackgroundButton";
import { BoardThemeProvider } from "../../hooks/useBoardTheme";
import { buildGenerateBackgroundPrompt, readThemePalette } from "../../utils/backgroundPrompt";
import { buildCodexPromptHref } from "../../utils/codexPrompt";

function renderButton() {
  return render(
    <BoardThemeProvider>
      <ChangeBackgroundButton />
    </BoardThemeProvider>
  );
}

describe("ChangeBackgroundButton", () => {
  it("copies the generate-background prompt in regular Chrome", async () => {
    const original = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () =>
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
    });
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    try {
      const { getByRole, queryByRole } = renderButton();
      expect(queryByRole("link", { name: "Change background image" })).toBeNull();
      getByRole("button", { name: "Change background image" }).click();
      await waitFor(() => {
        expect(writeText).toHaveBeenCalled();
      });
      expect(writeText.mock.calls[0][0]).toContain("set-page-background");
    } finally {
      Object.defineProperty(navigator, "userAgent", {
        configurable: true,
        get: () => original,
      });
    }
  });

  it("opens the generate-background prompt with codex:// on ChatGPT desktop", () => {
    const original = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () =>
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) ChatGPT/26.715.72359 Chrome/148.0.7778.180 Electron/42.3.0 Safari/537.36",
    });
    const open = jest.fn().mockReturnValue({});
    const originalOpen = window.open;
    window.open = open;
    try {
      const { getByRole, queryByRole } = renderButton();
      expect(queryByRole("button", { name: "Change background image" })).toBeNull();
      const link = getByRole("link", { name: "Change background image" });
      const prompt = buildGenerateBackgroundPrompt(readThemePalette("purple"));
      expect(link.getAttribute("href")).toBe(buildCodexPromptHref(prompt));
      link.click();
      expect(open).toHaveBeenCalledWith(
        buildCodexPromptHref(prompt),
        "_blank",
        "noopener"
      );
    } finally {
      window.open = originalOpen;
      Object.defineProperty(navigator, "userAgent", {
        configurable: true,
        get: () => original,
      });
    }
  });
});
