import { ABOUT_PATH, CHESS_PATH, TRIANGLES_PATH, appHref } from "./appRoute";
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

  it("treats /about as the home page and other paths as chess or triangles", () => {
    expect(currentSitePageId("/about")).toBe("about");
    expect(currentSitePageId("/")).toBe("chess");
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
    const listed = listSitePages("/about");
    expect(listed.currentPage).toBe("about");
    expect(listed.subnav.map((item) => item.id)).toEqual(["about", "chess", "triangles"]);
    const chess = listed.subnav.find((item) => item.id === "chess");
    expect(chess?.available).toBe(true);
    expect(chess?.current).toBe(false);
    expect(chess?.href).toBe(appHref(CHESS_PATH));
    expect(listed.comingLater).not.toContain("Geometry");
    expect(listed.comingLater).toContain("Circuits");
  });

  it("navigates to the chess app by pushing /chess", () => {
    window.history.pushState({}, "", ABOUT_PATH);
    const result = navigateToSitePage("chess");
    expect(result.success).toBe(true);
    expect(result.data.alreadyThere).toBe(false);
    expect(window.location.pathname).toBe(CHESS_PATH);
    expect(result.message).toMatch(/chess learning app/i);
  });

  it("navigates to triangles by pushing /triangles", () => {
    window.history.pushState({}, "", ABOUT_PATH);
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
});
