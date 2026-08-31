import { BoardThemeId } from "./themeBackgrounds";

export type ThemePalette = {
  theme: BoardThemeId;
  page: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
  darkSquare: string;
  lightSquare: string;
};

const FALLBACK: Record<BoardThemeId, ThemePalette> = {
  neon: {
    theme: "neon",
    page: "#140c1c",
    accent: "#4a2a72",
    accentHover: "#5c3488",
    accentSoft: "#c4b0e8",
    darkSquare: "#9b74d8",
    lightSquare: "#e6def6",
  },
  modern: {
    theme: "modern",
    page: "#202020",
    accent: "#779556",
    accentHover: "#6a854c",
    accentSoft: "#9ccc65",
    darkSquare: "#779556",
    lightSquare: "#ebecd0",
  },
};

function cssColor(el: Element | null, property: string): string {
  if (!(el instanceof HTMLElement)) {
    return "";
  }
  return window.getComputedStyle(el).getPropertyValue(property).trim();
}

export function readThemePalette(theme: BoardThemeId): ThemePalette {
  const fallback = FALLBACK[theme];
  const root = document.querySelector("[data-board-theme]");
  const dark = document.querySelector(".black-tile");
  const light = document.querySelector(".white-tile");
  return {
    theme,
    page: cssColor(root, "background-color") || fallback.page,
    accent: cssColor(root, "--accent") || fallback.accent,
    accentHover: cssColor(root, "--accent-hover") || fallback.accentHover,
    accentSoft: cssColor(root, "--accent-soft") || fallback.accentSoft,
    darkSquare: cssColor(dark, "background-color") || fallback.darkSquare,
    lightSquare: cssColor(light, "background-color") || fallback.lightSquare,
  };
}

export function buildGenerateBackgroundPrompt(palette: ThemePalette): string {
  return [
    `Generate a full-bleed atmospheric background image for this chess page in the ${palette.theme} board theme.`,
    "Match this palette closely: no text, no UI, no chess pieces, no chessboard.",
    `Page ${palette.page}, accent ${palette.accent}, accent hover ${palette.accentHover}, soft accent ${palette.accentSoft}, dark squares ${palette.darkSquare}, light squares ${palette.lightSquare}.`,
    "After the image is generated, call set-page-background with it (data URL, base64, or url) so it is saved for the currently selected theme only.",
  ].join(" ");
}
