import { CHESS_PATH, HOME_PATH, TRIANGLES_PATH, appHref } from "./appRoute";
import {
  currentSitePageId,
  listSitePages,
  navigateToSitePage,
  parseSitePageId,
} from "./sitePages";

describe("sitePages", () => {
  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("treats / as the home page and other paths as chess or triangles", () => {
    expect(currentSitePageId("/")).toBe("about");
    expect(currentSitePageId("/about")).toBe("about");
    expect(currentSitePageId("/chess")).toBe("chess");
    expect(currentSitePageId("/triangles")).toBe("triangles");
  });

  it("accepts home/board/geometry aliases for page ids", () => {
    expect(parseSitePageId("home")).toBe("about");
    expect(parseSitePageId("Chess")).toBe("chess");
    expect(parseSitePageId("board")).toBe("chess");
    expect(parseSitePageId("geometry")).toBe("triangles");
    expect(parseSitePageId("triangles")).toBe("triangles");
  });

  it("lists chess and triangles in the sub-navigation as available pages", () => {
    const listed = listSitePages("/");
    expect(listed.currentPage).toBe("about");
    expect(listed.subnav.map((item) => item.id)).toEqual(["about", "chess", "triangles"]);
    const home = listed.subnav.find((item) => item.id === "about");
    expect(home?.href).toBe("/");
    expect(home?.current).toBe(true);
    const chess = listed.subnav.find((item) => item.id === "chess");
    expect(chess?.available).toBe(true);
    expect(chess?.current).toBe(false);
    expect(chess?.href).toBe(appHref(CHESS_PATH));
    expect(listed.comingLater).not.toContain("Geometry");
    expect(listed.comingLater).toContain("Circuits");
  });

  it("navigates to the chess app by pushing /chess", () => {
    window.history.pushState({}, "", HOME_PATH);
    const result = navigateToSitePage("chess");
    expect(result.success).toBe(true);
    expect(result.data.alreadyThere).toBe(false);
    expect(window.location.pathname).toBe(CHESS_PATH);
    expect(result.message).toMatch(/chess learning app/i);
  });

  it("navigates to triangles by pushing /triangles", () => {
    window.history.pushState({}, "", HOME_PATH);
    const result = navigateToSitePage("triangles");
    expect(result.success).toBe(true);
    expect(window.location.pathname).toBe(TRIANGLES_PATH);
  });

  it("does not rewrite the path when already on chess", () => {
    window.history.pushState({}, "", CHESS_PATH);
    const result = navigateToSitePage("chess");
    expect(result.data.alreadyThere).toBe(true);
    expect(window.location.pathname).toBe(CHESS_PATH);
  });

  it("navigates home to /", () => {
    window.history.pushState({}, "", CHESS_PATH);
    const result = navigateToSitePage("about");
    expect(result.success).toBe(true);
    expect(window.location.pathname).toBe("/");
  });
});
