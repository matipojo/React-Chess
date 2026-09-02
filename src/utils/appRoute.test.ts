import {
  appBasePath,
  appHref,
  parseAppRoute,
} from "./appRoute";

describe("parseAppRoute", () => {
  it("treats /about as the about page", () => {
    expect(parseAppRoute("/about")).toBe("about");
    expect(parseAppRoute("/about/")).toBe("about");
  });

  it("treats /triangles as the triangle area", () => {
    expect(parseAppRoute("/triangles")).toBe("triangles");
    expect(parseAppRoute("/triangles/")).toBe("triangles");
  });

  it("treats / and /chess as chess", () => {
    expect(parseAppRoute("/")).toBe("chess");
    expect(parseAppRoute("/chess")).toBe("chess");
    expect(parseAppRoute("")).toBe("chess");
  });

  it("strips the public URL base path", () => {
    expect(parseAppRoute("/WebMCP-React-Chess/triangles", "/WebMCP-React-Chess")).toBe(
      "triangles"
    );
    expect(parseAppRoute("/WebMCP-React-Chess/about", "/WebMCP-React-Chess")).toBe("about");
    expect(parseAppRoute("/WebMCP-React-Chess", "/WebMCP-React-Chess")).toBe("chess");
  });
});

describe("appHref", () => {
  it("prefixes the public URL base path", () => {
    expect(appHref("/triangles", "")).toBe("/triangles");
    expect(appHref("/chess", "/WebMCP-React-Chess")).toBe("/WebMCP-React-Chess/chess");
    expect(appHref("/", "")).toBe("/");
    expect(appHref("/", "/app")).toBe("/app");
  });

  it("treats a relative homepage as no base", () => {
    expect(appBasePath(".")).toBe("");
    expect(appBasePath("")).toBe("");
  });
});
