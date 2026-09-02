import {
  appBasePath,
  appHref,
  migrateLegacyLocation,
  parseAppRoute,
} from "./appRoute";

describe("parseAppRoute", () => {
  it("treats / and /about as the home page", () => {
    expect(parseAppRoute("/")).toBe("about");
    expect(parseAppRoute("")).toBe("about");
    expect(parseAppRoute("/about")).toBe("about");
    expect(parseAppRoute("/about/")).toBe("about");
  });

  it("treats /triangles as the triangle area", () => {
    expect(parseAppRoute("/triangles")).toBe("triangles");
    expect(parseAppRoute("/triangles/")).toBe("triangles");
  });

  it("treats /chess as chess", () => {
    expect(parseAppRoute("/chess")).toBe("chess");
    expect(parseAppRoute("/chess/")).toBe("chess");
  });

  it("strips the public URL base path", () => {
    expect(parseAppRoute("/WebMCP-React-Chess/triangles", "/WebMCP-React-Chess")).toBe(
      "triangles"
    );
    expect(parseAppRoute("/WebMCP-React-Chess/about", "/WebMCP-React-Chess")).toBe("about");
    expect(parseAppRoute("/WebMCP-React-Chess", "/WebMCP-React-Chess")).toBe("about");
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

describe("migrateLegacyLocation", () => {
  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("rewrites /about to the home path", () => {
    window.history.pushState({}, "", "/about");
    expect(migrateLegacyLocation()).toBe("about");
    expect(window.location.pathname).toBe("/");
  });

  it("keeps / as the home page", () => {
    window.history.pushState({}, "", "/");
    expect(migrateLegacyLocation()).toBe("about");
    expect(window.location.pathname).toBe("/");
  });

  it("rewrites #chess to /chess", () => {
    window.history.pushState({}, "", "/#chess");
    expect(migrateLegacyLocation()).toBe("chess");
    expect(window.location.pathname).toBe("/chess");
  });
});
