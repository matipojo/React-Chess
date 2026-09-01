export const EXAMPLE_LESSON_PROMPTS = [
  "show me Scholar's Mate",
  "teach me the Italian",
  "quiz me on forks",
];

export function isCodexHost(
  userAgent = typeof navigator !== "undefined" ? navigator.userAgent : ""
): boolean {
  return /\bCodex\b/i.test(userAgent) || /\bChatGPT\b/i.test(userAgent);
}

export function buildCodexPromptHref(prompt: string): string {
  return `codex://new?prompt=${encodeURIComponent(prompt)}`;
}
