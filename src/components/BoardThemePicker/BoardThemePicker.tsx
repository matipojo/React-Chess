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
          aria-checked={theme === "classic"}
          className={theme === "classic" ? "is-active" : undefined}
          onClick={() => setTheme("classic")}
        >
          Classic
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={theme === "purple"}
          className={theme === "purple" ? "is-active" : undefined}
          onClick={() => setTheme("purple")}
        >
          Purple
        </button>
      </div>
    </fieldset>
  );
}
