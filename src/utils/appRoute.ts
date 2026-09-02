export type AppRoute = "about" | "chess" | "triangles";

export const HOME_PATH = "/";
export const ABOUT_PATH = "/about";
export const CHESS_PATH = "/chess";
export const TRIANGLES_PATH = "/triangles";

export function appBasePath(
  publicUrl = typeof process !== "undefined" ? process.env.PUBLIC_URL : ""
): string {
  const raw = (publicUrl || "").trim();
  if (!raw || raw === ".") {
    return "";
  }
  try {
    if (/^https?:\/\//i.test(raw)) {
      return new URL(raw).pathname.replace(/\/$/, "");
    }
  } catch {
    // Fall through to path handling.
  }
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  return path.replace(/\/$/, "");
}

export function appHref(path: string, basePath = appBasePath()): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") {
    return basePath || "/";
  }
  return `${basePath}${normalized}`;
}

function routeFromSegments(segments: string[]): AppRoute {
  const first = (segments[0] || "").toLowerCase();
  if (first === "triangles") {
    return "triangles";
  }
  if (first === "chess") {
    return "chess";
  }
  return "about";
}

export function parseAppRoute(
  pathname = typeof window !== "undefined" ? window.location.pathname : "/",
  basePath = appBasePath()
): AppRoute {
  let path = pathname || "/";
  if (basePath && (path === basePath || path.startsWith(`${basePath}/`))) {
    path = path.slice(basePath.length) || "/";
  }
  const segments = path
    .replace(/^\//, "")
    .replace(/\/$/, "")
    .split("/")
    .filter(Boolean);
  return routeFromSegments(segments);
}

function isAboutAliasPath(pathname: string, basePath = appBasePath()): boolean {
  let path = pathname || "/";
  if (basePath && (path === basePath || path.startsWith(`${basePath}/`))) {
    path = path.slice(basePath.length) || "/";
  }
  const trimmed = path.replace(/\/$/, "") || "/";
  return trimmed === ABOUT_PATH;
}

export function migrateLegacyLocation(): AppRoute {
  if (typeof window === "undefined") {
    return "about";
  }
  const params = new URLSearchParams(window.location.search);
  const hash = (window.location.hash || "").replace(/^#/, "").replace(/^\//, "").split("?")[0];
  let nextPath: string | null = null;
  if (params.get("area") === "triangles") {
    nextPath = TRIANGLES_PATH;
    params.delete("area");
  } else if (hash === "about" || isAboutAliasPath(window.location.pathname)) {
    nextPath = HOME_PATH;
  } else if (hash === "triangles") {
    nextPath = TRIANGLES_PATH;
  } else if (hash === "chess" || hash === "play") {
    nextPath = CHESS_PATH;
  }
  if (nextPath) {
    const qs = params.toString();
    window.history.replaceState(
      {},
      "",
      appHref(nextPath) + (qs ? `?${qs}` : "")
    );
    return parseAppRoute(nextPath);
  }
  return parseAppRoute(window.location.pathname);
}
