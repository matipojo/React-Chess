import { useRef } from "react";
import { useBoardTheme } from "../../hooks/useBoardTheme";
import { preparePageBackground } from "../../utils/pageBackground";
import "./BoardThemePicker.css";

export default function BoardThemePicker() {
  const { theme, setTheme, customBackground, setCustomBackground } = useBoardTheme();
  const fileRef = useRef<HTMLInputElement>(null);

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
      <input
        ref={fileRef}
        className="board-theme-picker-file"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
        aria-label="Page background image"
        onChange={async (event) => {
          const file = event.target.files && event.target.files[0];
          event.target.value = "";
          if (!file) {
            return;
          }
          const dataUrl = await readLocalImage(file);
          const prepared = await preparePageBackground({ image: dataUrl });
          if (prepared.ok) {
            setCustomBackground(prepared.cssUrl);
          }
        }}
      />
      <button
        type="button"
        className={customBackground ? "board-theme-picker-photo is-active" : "board-theme-picker-photo"}
        onClick={() => fileRef.current?.click()}
      >
        Photo
      </button>
      {customBackground && (
        <button
          type="button"
          className="board-theme-picker-photo"
          onClick={() => setCustomBackground(null)}
        >
          Reset
        </button>
      )}
    </fieldset>
  );
}

function readLocalImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Could not read image"));
    };
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}
