export const EXAMPLE_LESSON_PROMPTS = [
  "Show Scholar's Mate",
  "Teach me the Italian opening",
  "Quiz me on forks",
];

export const CODEX_UNAVAILABLE_MESSAGE = "Codex is not available";
export const COPIED_PROMPT_TIP = "Copied. Paste this in your AI agent's chat.";

type NavigatorWithUAData = Navigator & {
  userAgentData?: { brands?: Array<{ brand: string }> };
};

export type CodexHostHints = {
  userAgent?: string;
  brands?: string[];
};

function navigatorBrands(): string[] {
  if (typeof navigator === "undefined") {
    return [];
  }
  const data = (navigator as NavigatorWithUAData).userAgentData;
  return (data?.brands || [])
    .map((item) => item.brand)
    .filter((brand) => Boolean(brand));
}

function looksLikeCodexHost(userAgent: string, brands: string[]): boolean {
  const haystack = [userAgent, ...brands].join(" ");
  // ChatGPT desktop identifies as ChatGPT/26, ChatGPTBrowser, Codex, or Electron.
  // Regular Chrome with chrome://flags/#enable-webmcp-testing does not.
  return /chatgpt|codex|electron/i.test(haystack);
}

export function currentPageHref(
  href = typeof window !== "undefined" ? window.location.href : ""
): string {
  return (href || "").trim();
}

export function capitalizePrompt(prompt: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function promptWithCurrentLocation(
  prompt: string,
  href = currentPageHref()
): string {
  const capitalized = capitalizePrompt(prompt);
  const location = currentPageHref(href);
  if (!capitalized) {
    return "";
  }
  if (!location || capitalized.includes(location)) {
    return capitalized;
  }
  return `${capitalized} using ${location}`;
}

export function isCodexHost(
  userAgentOrHints:
    | string
    | CodexHostHints = typeof navigator !== "undefined" ? navigator.userAgent : ""
): boolean {
  const hints: CodexHostHints =
    typeof userAgentOrHints === "string"
      ? { userAgent: userAgentOrHints }
      : userAgentOrHints;
  const userAgent =
    hints.userAgent ??
    (typeof navigator !== "undefined" ? navigator.userAgent : "");
  const brands = hints.brands ?? navigatorBrands();
  return looksLikeCodexHost(userAgent, brands);
}

export function buildCodexPromptHref(prompt: string, href = currentPageHref()): string {
  return `codex://new?prompt=${encodeURIComponent(promptWithCurrentLocation(prompt, href))}`;
}

export function openCodexPrompt(prompt: string): void {
  const href = buildCodexPromptHref(prompt);
  if (typeof window === "undefined") {
    return;
  }
  try {
    const opened = window.open(href, "_blank", "noopener");
    if (opened) {
      return;
    }
  } catch {
    /* Some hosts block window.open for custom schemes. */
  }
  window.location.assign(href);
}

export async function sharePromptWithHost(
  prompt: string,
  copyText: (text: string) => Promise<boolean>
): Promise<"opened" | "copied" | "failed"> {
  if (isCodexHost()) {
    openCodexPrompt(prompt);
    return "opened";
  }
  try {
    return (await copyText(promptWithCurrentLocation(prompt))) ? "copied" : "failed";
  } catch {
    return "failed";
  }
}
