export type AppRoute = "about" | "play";

export const ABOUT_HASH = "#/about";
export const PLAY_HASH = "#/";

export function parseAppRoute(
  hash = typeof window !== "undefined" ? window.location.hash : ""
): AppRoute {
  const path = (hash || "")
    .replace(/^#/, "")
    .split("?")[0]
    .replace(/^\//, "")
    .replace(/\/$/, "");
  return path === "about" ? "about" : "play";
}
