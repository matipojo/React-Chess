import { useState } from "react";
import { useBoardTheme } from "../../hooks/useBoardTheme";
import { copyPlainText } from "../../lessons/waitForUser";
import { buildGenerateBackgroundPrompt, readThemePalette } from "../../utils/backgroundPrompt";
import "./ChangeBackgroundButton.css";

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M19 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 12H5V7h14v10zM8.5 11.5A1.5 1.5 0 1 0 7 10a1.5 1.5 0 0 0 1.5 1.5zM6 16l2.8-3.6 2.2 2.7 3-3.9L18 16z"
      />
    </svg>
  );
}

const COPIED_MESSAGE =
  "Prompt copied. Paste it to your agent to generate a custom background image.";

export default function ChangeBackgroundButton() {
  const { theme } = useBoardTheme();
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={copied ? "change-bg-btn is-copied" : "change-bg-btn"}
      aria-label={copied ? COPIED_MESSAGE : "Change background image"}
      title={copied ? COPIED_MESSAGE : "Change background image"}
      aria-live="polite"
      onClick={async () => {
        const prompt = buildGenerateBackgroundPrompt(readThemePalette(theme));
        const ok = await copyPlainText(prompt);
        if (!ok) {
          return;
        }
        setCopied(true);
        window.setTimeout(() => setCopied(false), 5500);
      }}
    >
      {copied ? null : <ImageIcon />}
      <span className="change-bg-btn-label">
        {copied ? COPIED_MESSAGE : "Bg"}
      </span>
    </button>
  );
}
