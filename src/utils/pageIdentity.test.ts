import { applyPageIdentity, pageIdentity, publicAssetHref } from "./pageIdentity";

describe("publicAssetHref", () => {
  it("uses a root-absolute path when there is no public URL", () => {
    expect(publicAssetHref("favicon-home.svg", "")).toBe("/favicon-home.svg");
    expect(publicAssetHref("favicon-triangles.svg", ".")).toBe("/favicon-triangles.svg");
  });

  it("prefixes a hosted base path", () => {
    expect(publicAssetHref("favicon-chess.svg", "/WebMCP-React-Chess")).toBe(
      "/WebMCP-React-Chess/favicon-chess.svg"
    );
  });
});

describe("pageIdentity", () => {
  it("gives the home page its own stacked-logo favicon, not chess", () => {
    const home = pageIdentity("about", "");
    expect(home.title).toBe("Generative Learning");
    expect(home.icon).toBe("/favicon-home.svg");
    expect(home.icon).not.toMatch(/chess/i);
  });

  it("gives triangles its own geometry favicon, not chess", () => {
    const triangles = pageIdentity("triangles", "");
    expect(triangles.title).toBe("Triangles · Generative Learning");
    expect(triangles.icon).toBe("/favicon-triangles.svg");
    expect(triangles.icon).not.toMatch(/chess/i);
  });

  it("keeps a chess knight favicon on the chess app", () => {
    const chess = pageIdentity("chess", "");
    expect(chess.title).toBe("Chess · Generative Learning");
    expect(chess.icon).toBe("/favicon-chess.svg");
  });
});

describe("applyPageIdentity", () => {
  afterEach(() => {
    document.title = "";
    document.querySelectorAll("link[rel='icon'], link[rel='shortcut icon']").forEach((el) => {
      el.parentNode?.removeChild(el);
    });
  });

  it("replaces a chess favicon when opening the home page", () => {
    const stale = document.createElement("link");
    stale.rel = "icon";
    stale.href = "/favicon-chess.svg";
    document.head.appendChild(stale);

    applyPageIdentity("about");

    expect(document.title).toBe("Generative Learning");
    const icons = Array.from(document.querySelectorAll("link[rel='icon']"));
    expect(icons).toHaveLength(1);
    expect(icons[0].getAttribute("href")).toBe("/favicon-home.svg");
  });

  it("sets the triangles favicon and title", () => {
    applyPageIdentity("triangles");
    expect(document.title).toBe("Triangles · Generative Learning");
    expect(document.querySelector("link[rel='icon']")?.getAttribute("href")).toBe(
      "/favicon-triangles.svg"
    );
  });
});
