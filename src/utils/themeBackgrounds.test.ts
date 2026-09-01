import {
  compactThemeBackgrounds,
  isStoredBackground,
  parseThemeBackgrounds,
  persistThemeBackgrounds,
  readThemeBackgrounds,
  BACKGROUND_MAP_KEY,
  LEGACY_BACKGROUND_KEY,
} from "./themeBackgrounds";

const SAMPLE = "https://example.com/purple.jpg";

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
        JSON.stringify({ purple: SAMPLE, classic: "not-an-image", extra: SAMPLE })
      )
    ).toEqual({ purple: SAMPLE, classic: null });
  });

  it("maps a legacy modern background onto classic", () => {
    expect(
      parseThemeBackgrounds(JSON.stringify({ modern: SAMPLE }))
    ).toEqual({ classic: SAMPLE, purple: null });
  });

  it("maps a legacy neon background onto purple", () => {
    expect(
      parseThemeBackgrounds(JSON.stringify({ neon: SAMPLE }))
    ).toEqual({ classic: null, purple: SAMPLE });
  });

  it("omits empty themes when compacting", () => {
    expect(compactThemeBackgrounds({ purple: SAMPLE, classic: null })).toEqual({
      purple: SAMPLE,
    });
  });

  it("migrates a legacy global background onto the current theme", () => {
    window.localStorage.setItem(LEGACY_BACKGROUND_KEY, SAMPLE);
    const map = readThemeBackgrounds("classic");
    expect(map).toEqual({ classic: SAMPLE, purple: null });
    expect(window.localStorage.getItem(LEGACY_BACKGROUND_KEY)).toBeNull();
    expect(window.localStorage.getItem(BACKGROUND_MAP_KEY)).toContain("classic");
  });

  it("persists and clears the map", () => {
    expect(persistThemeBackgrounds({ purple: SAMPLE, classic: null })).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(BACKGROUND_MAP_KEY) || "{}")).toEqual({
      purple: SAMPLE,
    });
    expect(persistThemeBackgrounds({ purple: null, classic: null })).toBe(true);
    expect(window.localStorage.getItem(BACKGROUND_MAP_KEY)).toBeNull();
  });
});
