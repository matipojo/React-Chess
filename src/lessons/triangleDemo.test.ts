import { ALTITUDE_DEMO, parseTriangleDemo } from "./triangleDemo";

describe("triangle demo links", () => {
  it("parses pointer and altitude demo query params", () => {
    expect(parseTriangleDemo("?demo=altitude")).toBe("altitude");
    expect(parseTriangleDemo("?demo=pointer")).toBe("pointer");
    expect(parseTriangleDemo("")).toBe(null);
    expect(parseTriangleDemo("?demo=other")).toBe(null);
  });

  it("uses a right triangle at C and the altitude to the hypotenuse", () => {
    expect(ALTITUDE_DEMO.template).toBe("right-at-C");
    expect(ALTITUDE_DEMO.gan).toBe("h(C,AB)");
    expect(ALTITUDE_DEMO.stepTitle).toBe("Drop the altitude");
    expect(ALTITUDE_DEMO.title).toBe("Altitude to the hypotenuse");
  });
});
