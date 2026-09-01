export const BACKGROUND_MAP_KEY = "page-background-by-theme";
export const LEGACY_BACKGROUND_KEY = "page-background";

export type BoardThemeId = "classic" | "purple";
export type ThemeBackgroundMap = Record<BoardThemeId, string | null>;

export function emptyThemeBackgrounds(): ThemeBackgroundMap {
  return { classic: null, purple: null };
}

export function isStoredBackground(value: string): boolean {
  return value.startsWith("data:image/") || /^https?:\/\//i.test(value);
}

export function parseThemeBackgrounds(raw: string | null): ThemeBackgroundMap {
  const next = emptyThemeBackgrounds();
  if (!raw) {
    return next;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return next;
    }
    const rec = parsed as Record<string, unknown>;
    (Object.keys(next) as BoardThemeId[]).forEach((theme) => {
      const value = rec[theme];
      if (typeof value === "string" && isStoredBackground(value)) {
        next[theme] = value;
      }
    });
    if (!next.classic) {
      const legacyModern = rec.modern;
      if (typeof legacyModern === "string" && isStoredBackground(legacyModern)) {
        next.classic = legacyModern;
      }
    }
    if (!next.purple) {
      const legacyNeon = rec.neon;
      if (typeof legacyNeon === "string" && isStoredBackground(legacyNeon)) {
        next.purple = legacyNeon;
      }
    }
  } catch {
    /* ignore */
  }
  return next;
}

export function compactThemeBackgrounds(map: ThemeBackgroundMap): Record<string, string> {
  const compact: Record<string, string> = {};
  (Object.keys(map) as BoardThemeId[]).forEach((theme) => {
    const value = map[theme];
    if (value) {
      compact[theme] = value;
    }
  });
  return compact;
}

export function readThemeBackgrounds(currentTheme: BoardThemeId): ThemeBackgroundMap {
  const map = parseThemeBackgrounds(
    (() => {
      try {
        return window.localStorage.getItem(BACKGROUND_MAP_KEY);
      } catch {
        return null;
      }
    })()
  );

  try {
    const legacy = window.localStorage.getItem(LEGACY_BACKGROUND_KEY);
    if (legacy && isStoredBackground(legacy) && !map[currentTheme]) {
      map[currentTheme] = legacy;
      persistThemeBackgrounds(map);
      window.localStorage.removeItem(LEGACY_BACKGROUND_KEY);
    }
  } catch {
    /* ignore */
  }

  return map;
}

export function persistThemeBackgrounds(map: ThemeBackgroundMap): boolean {
  try {
    const compact = compactThemeBackgrounds(map);
    if (Object.keys(compact).length === 0) {
      window.localStorage.removeItem(BACKGROUND_MAP_KEY);
    } else {
      window.localStorage.setItem(BACKGROUND_MAP_KEY, JSON.stringify(compact));
    }
    try {
      window.localStorage.removeItem(LEGACY_BACKGROUND_KEY);
    } catch {
      /* ignore */
    }
    return true;
  } catch {
    return false;
  }
}
