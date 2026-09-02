export const CHAT_BUTTON_TEXT = "#ffffff";
export const HINT_BUTTON_LABEL = "Give me a hint";

/** Hosts like Codex also have file/browser/HTML tools. Those must not replace this page. */
export const PAGE_IS_THE_CANVAS =
  "The open page is already the interactive visualization. Never create an HTML file, a new canvas, a download, or a separate figure. Use chat visualization UI only for clickable buttons in this chat, never to draw the lesson.";

export type AskSurface = "chess" | "triangle";

function visualizationButtonStyle(accent: string, text = CHAT_BUTTON_TEXT): string {
  const background = accent.trim() || "#8a5fc8";
  const label = text.trim() || CHAT_BUTTON_TEXT;
  return [
    `Layout must look airy and spacious: 20px space above the first button so it is not flush under the question text; each button hugs its label (not full row); padding 14px 22px inside so text is not flush to the edges; 16px vertical gap between buttons; do not stack them tight.`,
    `Button colors (required, high contrast): background ${background}, label text ${label}. The label must stay readable. Never use the background color for the text.`,
  ].join(" ");
}

function surfaceCopy(surface: AskSurface) {
  if (surface === "triangle") {
    return {
      page: "triangle page",
      puzzle: "The puzzle is already on the figure.",
      spoil: "Do not explain how to solve it. Do not name the construction, the point, or the key object until they tap the hint button.",
      riddle:
        "Then call add-lesson-step with type riddle (question and correct GAN objects such as G or ∠C) to store the puzzle on the lesson. Use ask-quiz only if this puzzle is not a catalog lesson step.",
    };
  }
  return {
    page: "chess page",
    puzzle: "The puzzle is not on the chess page yet. Do not tell the student it is ready.",
    spoil: "Do not explain how to solve it. Do not name the tactic, the piece, or the key square until they tap the hint button.",
    riddle:
      "Then call add-lesson-step with type riddle (question and correct squares). That tool puts the puzzle on the chess page — wait for it to succeed before you say the quiz is ready. Use ask-quiz only if this puzzle is not a catalog lesson step.",
  };
}

/** Instruction returned by how_to_ask_the_user so the host chat asks, not the page. */
export function buildHowToAskTheUserPrompt(
  accent: string,
  text = CHAT_BUTTON_TEXT,
  surface: AskSurface = "chess"
): string {
  const copy = surfaceCopy(surface);
  return [
    `REQUIRED: use your inline visualization / interactive widget UI ONLY to create real clickable buttons in this chat — not on the open ${copy.page}. ${PAGE_IS_THE_CANVAS}`,
    `Do not list options as 1/2/3. Do not ask the student to type a choice or pick from a numbered list. They must tap a button.`,
    `Render one short question, then three continuation buttons the student can click. Each button on its own new line, stacked vertically, never in a single row.`,
    visualizationButtonStyle(accent, text),
    `After the buttons are on screen, stop and wait for the click. Do not put the question or choices on the ${copy.page}.`,
  ].join(" ");
}

/** Instruction returned after a puzzle so the host chat offers an opt-in hint, not a spoiler on the board. */
export function buildGiveMeAHintPrompt(
  accent: string,
  text = CHAT_BUTTON_TEXT,
  surface: AskSurface = "chess"
): string {
  const copy = surfaceCopy(surface);
  return [
    `REQUIRED: use your inline visualization / interactive widget UI ONLY to create a real clickable button in this chat — not on the open ${copy.page}. ${PAGE_IS_THE_CANVAS}`,
    `${copy.puzzle} ${copy.spoil}`,
    `Do not list options as 1/2/3. Do not ask the student to type a choice.`,
    `Render one short line such as "Need a nudge?", then one button labeled "${HINT_BUTTON_LABEL}" on its own new line. Do not add other buttons yet.`,
    visualizationButtonStyle(accent, text),
    `Leave the button on screen. ${copy.riddle} If they tap ${HINT_BUTTON_LABEL}, give a small nudge in this chat — not the full answer, and not on the ${copy.page}.`,
  ].join(" ");
}

export function readBoardChatAccent(): string {
  const root = document.querySelector("[data-board-theme]");
  if (root instanceof HTMLElement) {
    const styles = window.getComputedStyle(root);
    const hover = styles.getPropertyValue("--accent-hover").trim();
    const accent = styles.getPropertyValue("--accent").trim();
    if (hover) {
      return hover;
    }
    if (accent) {
      return accent;
    }
  }
  return "#8a5fc8";
}
