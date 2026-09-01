import { fireEvent, render, waitFor } from "@testing-library/react";
import AboutPage from "./AboutPage";
import { BoardThemeProvider } from "../../hooks/useBoardTheme";
import { CODEX_UNAVAILABLE_MESSAGE, COPIED_PROMPT_TIP } from "../../utils/codexPrompt";

function renderAbout() {
  return render(
    <BoardThemeProvider>
      <AboutPage />
    </BoardThemeProvider>
  );
}

const CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36";
const CHATGPT_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) ChatGPT/26.715.72359 Chrome/148.0.7778.180 Electron/42.3.0 Safari/537.36";

describe("AboutPage", () => {
  it("renders the living surface story and a real Italian Game board", () => {
    const { getByText, getByRole, container } = renderAbout();
    expect(getByRole("link", { name: "Living Learning Surfaces" })).toBeTruthy();
    expect(getByText("Not the canvas.")).toBeTruthy();
    expect(getByText("Italian Game")).toBeTruthy();
    expect(getByText("3. Bc4")).toBeTruthy();
    const nav = getByRole("navigation", { name: "Learning surfaces" });
    expect(nav.querySelector('a[aria-current="page"]')?.textContent).toMatch(/Home/);
    expect(nav.querySelector(".about-subnav-chess")?.getAttribute("href")).toBe("#/");
    expect(container.querySelector("#chessboard")).toBeTruthy();
    expect(container.querySelectorAll(".chess-piece").length).toBe(32);
    expect(container.querySelectorAll(".board-arrows line").length).toBe(2);
  });

  it("copies example prompts and says Codex is not available in Chrome", async () => {
    const original = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () => CHROME_UA,
    });
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    try {
      const { getByRole, getAllByRole } = renderAbout();
      getByRole("button", { name: "teach me the Italian Game" }).click();
      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith("teach me the Italian Game");
      });
      expect(getByRole("button", { name: "teach me the Italian Game" })).toBeTruthy();
      expect(getAllByRole("status").some((node) => node.textContent === COPIED_PROMPT_TIP)).toBe(
        true
      );
      expect(getAllByRole("status").some((node) => node.textContent === CODEX_UNAVAILABLE_MESSAGE)).toBe(
        true
      );
    } finally {
      Object.defineProperty(navigator, "userAgent", {
        configurable: true,
        get: () => original,
      });
    }
  });

  it("submits the prompt box by copying when Codex is unavailable", async () => {
    const original = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () => CHROME_UA,
    });
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    try {
      const { getByPlaceholderText, getByLabelText, getAllByRole } = renderAbout();
      const input = getByPlaceholderText("What do you want to learn?") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "how do I castle?" } });
      getByLabelText("Start learning").click();
      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith("how do I castle?");
      });
      expect(
        getAllByRole("status").some(
          (node) => node.textContent === CODEX_UNAVAILABLE_MESSAGE
        )
      ).toBe(true);
    } finally {
      Object.defineProperty(navigator, "userAgent", {
        configurable: true,
        get: () => original,
      });
    }
  });

  it("opens example prompts with codex:// on ChatGPT desktop", () => {
    const original = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () => CHATGPT_UA,
    });
    const open = jest.fn().mockReturnValue({});
    const originalOpen = window.open;
    window.open = open;
    try {
      const { getByRole } = renderAbout();
      const link = getByRole("link", { name: "how does a knight move?" });
      expect(link.getAttribute("href")).toBe(
        "codex://new?prompt=how%20does%20a%20knight%20move%3F"
      );
      link.click();
      expect(open).toHaveBeenCalledWith(
        "codex://new?prompt=how%20does%20a%20knight%20move%3F",
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

  it("opens the prompt box with codex:// on ChatGPT desktop", () => {
    const original = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () => CHATGPT_UA,
    });
    const open = jest.fn().mockReturnValue({});
    const originalOpen = window.open;
    window.open = open;
    try {
      const { getByPlaceholderText, getAllByLabelText } = renderAbout();
      const input = getByPlaceholderText("What do you want to learn?");
      fireEvent.change(input, { target: { value: "teach me forks" } });
      const submit = getAllByLabelText("Start learning")[0];
      expect(submit.getAttribute("href")).toBe(
        "codex://new?prompt=teach%20me%20forks"
      );
      submit.click();
      expect(open).toHaveBeenCalledWith(
        "codex://new?prompt=teach%20me%20forks",
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

  it("registers list-pages and open-page so an agent can find Chess and open it", async () => {
    const registered: Array<{
      name: string;
      execute: (params: Record<string, unknown>) => Promise<{
        success: boolean;
        message: string;
        data: unknown;
      }>;
    }> = [];
    const modelContext = {
      provideContext: ({ tools }: { tools: typeof registered }) => {
        registered.splice(0, registered.length, ...tools);
      },
      clearContext: () => {
        registered.length = 0;
      },
    };
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: modelContext,
    });
    window.location.hash = "#/about";
    try {
      const { unmount } = renderAbout();
      expect(registered.map((tool) => tool.name)).toEqual(["list-pages", "open-page"]);
      const listed = await registered[0].execute({});
      expect(listed.success).toBe(true);
      expect(listed.message).toMatch(/sub-navigation includes Chess/i);
      const data = listed.data as {
        currentPage: string;
        subnav: Array<{ id: string; available: boolean }>;
      };
      expect(data.currentPage).toBe("about");
      expect(data.subnav.some((item) => item.id === "chess" && item.available)).toBe(true);
      const opened = await registered[1].execute({ page: "chess" });
      expect(opened.success).toBe(true);
      expect(window.location.hash).toBe("#/");
      unmount();
      expect(registered).toEqual([]);
    } finally {
      delete (document as { modelContext?: unknown }).modelContext;
      window.location.hash = "";
    }
  });
});
