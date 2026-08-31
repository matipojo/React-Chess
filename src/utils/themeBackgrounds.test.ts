import {
  compactThemeBackgrounds,
  isStoredBackground,
  parseThemeBackgrounds,
  persistThemeBackgrounds,
  readThemeBackgrounds,
  BACKGROUND_MAP_KEY,
  LEGACY_BACKGROUND_KEY,
} from "./themeBackgrounds";

const SAMPLE = "https://example.com/neon.jpg";

describe("themeBackgrounds", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("accepts data URLs and http(s) links", () => {
    expect(isStoredBackground("data:image/jpeg;base64,abc")).toBe(true);
    expect(isStoredBackground("https://cdn.example/a.png")).toBe(true);
    expect(isStoredBackground("javascript:alert(1)")).toBe(false);
  });

  it("parses a stored map and ignores junk", () => {
    expect(
      parseThemeBackgrounds(
        JSON.stringify({ neon: SAMPLE, modern: "not-an-image", extra: SAMPLE })
      )
    ).toEqual({ neon: SAMPLE, modern: null });
  });

  it("omits empty themes when compacting", () => {
    expect(compactThemeBackgrounds({ neon: SAMPLE, modern: null })).toEqual({
      neon: SAMPLE,
    });
  });

  it("migrates a legacy global background onto the current theme", () => {
    window.localStorage.setItem(LEGACY_BACKGROUND_KEY, SAMPLE);
    const map = readThemeBackgrounds("modern");
    expect(map).toEqual({ modern: SAMPLE, neon: null });
    expect(window.localStorage.getItem(LEGACY_BACKGROUND_KEY)).toBeNull();
    expect(window.localStorage.getItem(BACKGROUND_MAP_KEY)).toContain("modern");
  });

  it("persists and clears the map", () => {
    expect(persistThemeBackgrounds({ neon: SAMPLE, modern: null })).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(BACKGROUND_MAP_KEY) || "{}")).toEqual({
      neon: SAMPLE,
    });
    expect(persistThemeBackgrounds({ neon: null, modern: null })).toBe(true);
    expect(window.localStorage.getItem(BACKGROUND_MAP_KEY)).toBeNull();
  });
});
