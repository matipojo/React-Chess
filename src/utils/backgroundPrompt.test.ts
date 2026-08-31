import { buildGenerateBackgroundPrompt, ThemePalette } from "./backgroundPrompt";

const palette: ThemePalette = {
  theme: "purple",
  page: "#140c1c",
  accent: "#4a2a72",
  accentHover: "#5c3488",
  accentSoft: "#c4b0e8",
  darkSquare: "#9b74d8",
  lightSquare: "#e6def6",
};

describe("buildGenerateBackgroundPrompt", () => {
  it("asks chat to generate from theme colors and apply via the tool", () => {
    const prompt = buildGenerateBackgroundPrompt(palette);
    expect(prompt).toContain("purple");
    expect(prompt).toContain("#4a2a72");
    expect(prompt).toContain("#9b74d8");
    expect(prompt).toContain("set-page-background");
    expect(prompt).toContain("currently selected theme");
    expect(prompt).toContain("no chessboard");
  });
});
