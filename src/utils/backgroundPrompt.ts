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
  purple: {
    theme: "purple",
    page: "#140c1c",
    accent: "#4a2a72",
    accentHover: "#5c3488",
    accentSoft: "#c4b0e8",
    darkSquare: "#9b74d8",
    lightSquare: "#e6def6",
  },
  classic: {
    theme: "classic",
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
  return `Make a full-bleed background for the ${palette.theme} theme (${palette.accent}, ${palette.darkSquare}, ${palette.lightSquare}). No text, UI, or chess. Then call set-page-background for this theme only.`;
}
