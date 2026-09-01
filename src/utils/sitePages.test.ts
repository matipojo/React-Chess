import { ABOUT_HASH, PLAY_HASH } from "./appRoute";
import {
  currentSitePageId,
  listSitePages,
  navigateToSitePage,
  parseSitePageId,
} from "./sitePages";

describe("sitePages", () => {
  afterEach(() => {
    window.location.hash = "";
  });

  it("treats #/about as the home page and other hashes as chess", () => {
    expect(currentSitePageId("#/about")).toBe("about");
    expect(currentSitePageId("#/")).toBe("chess");
    expect(currentSitePageId("")).toBe("chess");
  });

  it("accepts home/board aliases for page ids", () => {
    expect(parseSitePageId("home")).toBe("about");
    expect(parseSitePageId("Chess")).toBe("chess");
    expect(parseSitePageId("board")).toBe("chess");
    expect(parseSitePageId("geometry")).toBeUndefined();
  });

  it("lists chess in the sub-navigation as the available second page", () => {
    const listed = listSitePages("#/about");
    expect(listed.currentPage).toBe("about");
    expect(listed.subnav.map((item) => item.id)).toEqual(["about", "chess"]);
    const chess = listed.subnav.find((item) => item.id === "chess");
    expect(chess?.available).toBe(true);
    expect(chess?.current).toBe(false);
    expect(chess?.href).toBe(PLAY_HASH);
    expect(chess?.description).toMatch(/sub-navigation/);
    expect(listed.comingLater).toContain("Geometry");
  });

  it("navigates to the chess app by setting the play hash", () => {
    window.location.hash = ABOUT_HASH;
    const result = navigateToSitePage("chess");
    expect(result.success).toBe(true);
    expect(result.data.alreadyThere).toBe(false);
    expect(window.location.hash).toBe(PLAY_HASH);
    expect(result.message).toMatch(/chess learning app/i);
  });

  it("does not rewrite the hash when already on chess", () => {
    window.location.hash = PLAY_HASH;
    const result = navigateToSitePage("chess");
    expect(result.data.alreadyThere).toBe(true);
    expect(window.location.hash).toBe(PLAY_HASH);
  });
});
