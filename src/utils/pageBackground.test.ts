import {
  compactImageParam,
  cssBackgroundImage,
  isSafeImageHttpUrl,
  mimeFromPayload,
  parseBackgroundToolArgs,
  toDataUrl,
} from "./pageBackground";

const TINY_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("pageBackground", () => {
  it("accepts a PNG data URL", () => {
    const result = toDataUrl(`data:image/png;base64,${TINY_PNG}`);
    expect(result).toEqual({
      ok: true,
      dataUrl: `data:image/png;base64,${TINY_PNG}`,
    });
  });

  it("wraps raw base64 when mimeType is set", () => {
    const result = toDataUrl(TINY_PNG, "image/png");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.dataUrl).toContain("data:image/png;base64,");
    }
  });

  it("rejects raw base64 without mimeType", () => {
    expect(toDataUrl(TINY_PNG).ok).toBe(false);
  });

  it("rejects non-image data URLs", () => {
    expect(toDataUrl("data:text/plain;base64,aaaa").ok).toBe(false);
  });

  it("allows http(s) image links and blocks other schemes", () => {
    expect(isSafeImageHttpUrl("https://example.com/bg.jpg")).toBe(true);
    expect(isSafeImageHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeImageHttpUrl("data:image/png;base64,xx")).toBe(false);
  });

  it("parses tool args", () => {
    expect(
      parseBackgroundToolArgs({
        image: `  data:image/jpeg;base64,${TINY_PNG}  `,
        clear: true,
        mimeType: "image/jpeg",
      })
    ).toEqual({
      clear: true,
      image: `data:image/jpeg;base64,${TINY_PNG}`,
      mimeType: "image/jpeg",
      url: undefined,
    });
  });

  it("omits huge image strings from logs", () => {
    const dataUrl = `data:image/png;base64,${TINY_PNG}`;
    expect(compactImageParam(dataUrl)).toEqual({
      omitted: "image",
      length: dataUrl.length,
      mime: "image/png",
    });
    expect(compactImageParam("classic")).toBe("classic");
  });

  it("wraps a URL for CSS background-image", () => {
    expect(cssBackgroundImage("https://example.com/a.png")).toBe('url("https://example.com/a.png")');
  });

  it("reads mime from a data URL", () => {
    expect(mimeFromPayload(`data:image/webp;base64,${TINY_PNG}`)).toBe("image/webp");
  });
});
