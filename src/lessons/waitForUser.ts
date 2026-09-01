import { WaitChoice } from "./types";

export const DEFAULT_WAIT_CHOICE: WaitChoice = {
  id: "continue",
  label: "Continue",
};

export function continueWaitChoice(choices: WaitChoice[]): WaitChoice {
  return choices.find((choice) => choice.id === DEFAULT_WAIT_CHOICE.id) || DEFAULT_WAIT_CHOICE;
}

export function normalizeWaitChoices(value: unknown): WaitChoice[] {
  if (!Array.isArray(value)) {
    return [DEFAULT_WAIT_CHOICE];
  }
  const choices: WaitChoice[] = [];
  for (const item of value) {
    if (typeof item === "string") {
      const id = item.trim();
      if (id) {
        choices.push({ id, label: id });
      }
      continue;
    }
    if (!item || typeof item !== "object") {
      continue;
    }
    const rec = item as Record<string, unknown>;
    const id = String(rec.id || rec.action || rec.value || "").trim();
    const label = String(rec.label || rec.name || rec.title || id).trim();
    if (id) {
      choices.push({ id, label: label || id });
    }
  }
  return choices.length ? choices : [DEFAULT_WAIT_CHOICE];
}

export function normalizeWaitPrompt(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return "What do you want to learn today?";
}

/** Slightly under a common 30s host abort so we can keep the prompt on screen. */
export const WAIT_TIMEOUT_MS = 28000;

export function formatWaitChoiceCopy(prompt: string, choice: WaitChoice): string {
  return [
    "The student answered a wait-for-user prompt. Continue from this choice.",
    `Q: ${prompt}`,
    `A: ${choice.label}`,
    `action: ${choice.id}`,
  ].join("\n");
}

export async function copyPlainText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}

export async function copyWaitChoice(prompt: string, choice: WaitChoice): Promise<boolean> {
  return copyPlainText(formatWaitChoiceCopy(prompt, choice));
}
