import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type BoardThemeId = "classic" | "modern" | "violet" | "neon";

const STORAGE_KEY = "board-theme";

type BoardThemeContextValue = {
  theme: BoardThemeId;
  setTheme: (theme: BoardThemeId) => void;
};

const BoardThemeContext = createContext<BoardThemeContextValue | null>(null);

function readStoredTheme(): BoardThemeId {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (
      stored === "classic" ||
      stored === "modern" ||
      stored === "violet" ||
      stored === "neon"
    ) {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return "neon";
}

export function BoardThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<BoardThemeId>(readStoredTheme);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme: setThemeState,
    }),
    [theme]
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
