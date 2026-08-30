/** Instruction returned by how_to_ask_the_user so the host chat asks, not the page. */
export function buildHowToAskTheUserPrompt(accent: string): string {
  const color = accent.trim() || "#8a5fc8";
  return [
    `REQUIRED: use your inline visualization / interactive widget UI to create real clickable buttons in this chat — not on the open chess page.`,
    `Do not list options as 1/2/3. Do not ask the student to type a choice or pick from a numbered list. They must tap a button.`,
    `Render one short question, then three continuation buttons the student can click — each button on its own new line, stacked vertically, never in a single row.`,
    `Make each button compact: width fits the label (not full row). Generous padding inside so text is not flush to the edges. Comfortable vertical gap between buttons.`,
    `Style the buttons with ${color}.`,
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
