import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  BoardThemeId,
  persistThemeBackgrounds,
  readThemeBackgrounds,
  ThemeBackgroundMap,
} from "../utils/themeBackgrounds";

export type { BoardThemeId };

const STORAGE_KEY = "board-theme";

type BoardThemeContextValue = {
  theme: BoardThemeId;
  setTheme: (theme: BoardThemeId) => void;
  customBackground: string | null;
  setCustomBackground: (cssUrl: string | null) => boolean;
};

const BoardThemeContext = createContext<BoardThemeContextValue | null>(null);

function readStoredTheme(): BoardThemeId {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "modern" || stored === "neon") {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return "neon";
}

export function BoardThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<BoardThemeId>(readStoredTheme);
  const [backgrounds, setBackgrounds] = useState<ThemeBackgroundMap>(() =>
    readThemeBackgrounds(readStoredTheme())
  );
  const customBackground = backgrounds[theme];

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const setCustomBackground = useCallback((cssUrl: string | null): boolean => {
    let persisted = true;
    setBackgrounds((current) => {
      const next: ThemeBackgroundMap = { ...current, [theme]: cssUrl };
      persisted = persistThemeBackgrounds(next);
      return next;
    });
    return persisted;
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme: setThemeState,
      customBackground,
      setCustomBackground,
    }),
    [theme, customBackground, setCustomBackground]
  );

  return (
    <BoardThemeContext.Provider value={value}>
      {children}
    </BoardThemeContext.Provider>
  );
}

export function useBoardTheme(): BoardThemeContextValue {
  const value = useContext(BoardThemeContext);
  if (!value) {
    throw new Error("useBoardTheme must be used inside BoardThemeProvider");
  }
  return value;
}
