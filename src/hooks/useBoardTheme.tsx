import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type BoardThemeId = "modern" | "neon";

const STORAGE_KEY = "board-theme";
const BACKGROUND_STORAGE_KEY = "page-background";

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
    if (
      stored === "modern" ||
      stored === "neon"
    ) {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return "neon";
}

function readStoredBackground(): string | null {
  try {
    const stored = window.localStorage.getItem(BACKGROUND_STORAGE_KEY);
    if (stored && (stored.startsWith("data:image/") || /^https?:\/\//i.test(stored))) {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function BoardThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<BoardThemeId>(readStoredTheme);
  const [customBackground, setCustomBackgroundState] = useState<string | null>(readStoredBackground);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const setCustomBackground = useCallback((cssUrl: string | null): boolean => {
    setCustomBackgroundState(cssUrl);
    try {
      if (cssUrl) {
        window.localStorage.setItem(BACKGROUND_STORAGE_KEY, cssUrl);
      } else {
        window.localStorage.removeItem(BACKGROUND_STORAGE_KEY);
      }
      return true;
    } catch {
      return false;
    }
  }, []);

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
