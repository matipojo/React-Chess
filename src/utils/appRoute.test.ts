import { parseAppRoute } from "./appRoute";

describe("parseAppRoute", () => {
  it("treats #/about as the about page", () => {
    expect(parseAppRoute("#/about")).toBe("about");
    expect(parseAppRoute("#about")).toBe("about");
    expect(parseAppRoute("#/about?x=1")).toBe("about");
  });

  it("treats other hashes as the play page", () => {
    expect(parseAppRoute("")).toBe("play");
    expect(parseAppRoute("#/")).toBe("play");
    expect(parseAppRoute("#")).toBe("play");
    expect(parseAppRoute("#/play")).toBe("play");
  });
});
