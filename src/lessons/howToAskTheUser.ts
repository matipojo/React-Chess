export const CHAT_BUTTON_TEXT = "#ffffff";

/** Instruction returned by how_to_ask_the_user so the host chat asks, not the page. */
export function buildHowToAskTheUserPrompt(accent: string, text = CHAT_BUTTON_TEXT): string {
  const background = accent.trim() || "#8a5fc8";
  const label = text.trim() || CHAT_BUTTON_TEXT;
  return [
    `REQUIRED: use your inline visualization / interactive widget UI to create real clickable buttons in this chat — not on the open chess page.`,
    `Do not list options as 1/2/3. Do not ask the student to type a choice or pick from a numbered list. They must tap a button.`,
    `Render one short question, then three continuation buttons the student can click — each button on its own new line, stacked vertically, never in a single row.`,
    `Layout must look airy and spacious: each button hugs its label (not full row); padding 14px 22px inside so text is not flush to the edges; 16px vertical gap between buttons; do not stack them tight.`,
    `Button colors (required, high contrast): background ${background}, label text ${label}. The label must stay readable — never use the background color for the text.`,
    "After the buttons are on screen, stop and wait for the click. Do not put the question or choices on the chess page.",
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
