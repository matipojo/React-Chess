import { useBoardTheme } from "../../hooks/useBoardTheme";
import "./BoardThemePicker.css";

export default function BoardThemePicker() {
  const { theme, setTheme } = useBoardTheme();

  return (
    <fieldset className="board-theme-picker">
      <legend className="board-theme-picker-label">Board</legend>
      <div className="board-theme-picker-options" role="radiogroup" aria-label="Board theme">
        <button
          type="button"
          role="radio"
          aria-checked={theme === "modern"}
          className={theme === "modern" ? "is-active" : undefined}
          onClick={() => setTheme("modern")}
        >
          Modern
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={theme === "neon"}
          className={theme === "neon" ? "is-active" : undefined}
          onClick={() => setTheme("neon")}
        >
          Neon
        </button>
      </div>
    </fieldset>
  );
}
