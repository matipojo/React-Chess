import { detectTextDirection } from "./text-direction";

describe("detectTextDirection", () => {
  it("returns ltr for English", () => {
    expect(detectTextDirection("Knights move in an L shape.")).toEqual({
      dir: "ltr",
    });
  });

  it("returns rtl and ar for Arabic", () => {
    expect(detectTextDirection("الحصان يتحرك على شكل حرف L")).toEqual({
      dir: "rtl",
      lang: "ar",
    });
  });

  it("treats mixed chess notation with Arabic as rtl", () => {
    expect(detectTextDirection("الحركة e2:e4 تفتح المركز")).toEqual({
      dir: "rtl",
      lang: "ar",
    });
  });

  it("keeps an Arabic sentence rtl even when it starts with a move number", () => {
    expect(
      detectTextDirection(
        "3...Nf6?? - الأسود يطور قطعة أخرى ويهاجم الملكة البيضاء"
      )
    ).toEqual({
      dir: "rtl",
      lang: "ar",
    });
  });
});
