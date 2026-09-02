import { fireEvent, render, waitFor } from "@testing-library/react";
import AboutPage from "./AboutPage";
import { BoardThemeProvider } from "../../hooks/useBoardTheme";
import { CODEX_UNAVAILABLE_MESSAGE, COPIED_PROMPT_TIP, promptWithCurrentLocation, buildCodexPromptHref } from "../../utils/codexPrompt";

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
  it("renders the generative learning pitch and example surfaces", () => {
    const { getByText, getByRole, getAllByRole, getAllByText, queryByText, container } = renderAbout();
    expect(getByRole("link", { name: "Generative Learning" }).getAttribute("href")).toBe("/");
    const nav = getByRole("navigation", { name: "Learning surfaces" });
    expect(nav.textContent).not.toMatch(/Home/);
    expect(nav.querySelector('a[aria-current="page"]')).toBeNull();
    expect(nav.querySelector(".about-subnav-chess")?.getAttribute("href")).toBe("/chess");
    expect(nav.querySelector(".about-subnav-triangles")?.getAttribute("href")).toBe(
      "/triangles"
    );
    expect(
      getAllByRole("link", { name: /Triangles/ }).some(
        (link) => link.getAttribute("href") === "/triangles"
      )
    ).toBe(true);
    expect(queryByText("Geometry")).toBeNull();
    expect(queryByText("Working demo. Available now.")).toBeNull();
    expect(queryByText("Possible applications - not announced products.")).toBeNull();
    expect(queryByText("Typical AI")).toBeNull();
    expect(queryByText("A different approach")).toBeNull();
    expect(
      getAllByText(
        "We build the learning surface once. Your AI agent personalizes the lesson endlessly."
      )
    ).toHaveLength(2);
    expect(getByText("You learn on a real chessboard or triangle canvas, not in a chat.")).toBeTruthy();
    expect(getByText(/Your AI agent teaches you there/)).toBeTruthy();
    expect(getByText("You and your AI agent share this board")).toBeTruthy();
    expect(queryByText("AI Tutor")).toBeNull();
    expect(queryByText("The AI teaches you there, and the lesson follows you.")).toBeNull();
    expect(getByText("Learn here, not in a chat")).toBeTruthy();
    expect(getByText("Open a board")).toBeTruthy();
    expect(getByText("Ask for a lesson")).toBeTruthy();
    expect(getByText("Choose a subject")).toBeTruthy();
    expect(getByText("Open the chessboard")).toBeTruthy();
    expect(getByText("Open the canvas")).toBeTruthy();
    expect(container.querySelector("#chessboard")).toBeTruthy();
    expect(container.querySelector(".geometry-canvas")).toBeTruthy();
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
      const button = getByRole("button", { name: "Show Scholar's Mate" });
      expect(button.getAttribute("title")).toBe("Copy prompt");
      expect(button.querySelector(".about-example-copy")).toBeTruthy();
      button.click();
      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith(
          promptWithCurrentLocation("Show Scholar's Mate")
        );
      });
      expect(getByRole("button", { name: "Show Scholar's Mate" })).toBeTruthy();
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
      fireEvent.change(input, { target: { value: "explain it another way" } });
      getByLabelText("Start learning").click();
      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith(
          promptWithCurrentLocation("explain it another way")
        );
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
      const link = getByRole("link", { name: "Show a right triangle and the altitude to the hypotenuse" });
      expect(link.getAttribute("href")).toBe(
        buildCodexPromptHref("Show a right triangle and the altitude to the hypotenuse")
      );
      link.click();
      expect(open).toHaveBeenCalledWith(
        buildCodexPromptHref("Show a right triangle and the altitude to the hypotenuse"),
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
      fireEvent.change(input, { target: { value: "slow down and explain that" } });
      const submit = getAllByLabelText("Start learning")[0];
      expect(submit.getAttribute("href")).toBe(
        buildCodexPromptHref("slow down and explain that")
      );
      submit.click();
      expect(open).toHaveBeenCalledWith(
        buildCodexPromptHref("slow down and explain that"),
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
    window.history.pushState({}, "", "/");
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
      expect(data.subnav.some((item) => item.id === "triangles" && item.available)).toBe(true);
      const opened = await registered[1].execute({ page: "chess" });
      expect(opened.success).toBe(true);
      expect(window.location.pathname).toBe("/chess");
      unmount();
      expect(registered).toEqual([]);
    } finally {
      delete (document as { modelContext?: unknown }).modelContext;
      window.history.pushState({}, "", "/");
    }
  });
});
