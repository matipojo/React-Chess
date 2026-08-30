import { detectTextDirection } from "./text-direction";

describe("detectTextDirection", () => {
  it("returns ltr for English", () => {
    expect(detectTextDirection("Knights move in an L shape.")).toEqual({
      dir: "ltr",
    });
  });

  it("returns rtl and he for Hebrew", () => {
    expect(detectTextDirection("הפרש זז בצורת L")).toEqual({
      dir: "rtl",
      lang: "he",
    });
  });

  it("returns rtl and ar for Arabic", () => {
    expect(detectTextDirection("الحصان يتحرك على شكل حرف L")).toEqual({
      dir: "rtl",
      lang: "ar",
    });
  });

  it("treats mixed chess notation with Hebrew as rtl", () => {
    expect(detectTextDirection("המהלך e2:e4 פותח את המרכז")).toEqual({
      dir: "rtl",
      lang: "he",
    });
  });
});
