import { ABOUT_PATH, CHESS_PATH, TRIANGLES_PATH, appHref, parseAppRoute } from "./appRoute";

export type SitePageId = "about" | "chess" | "triangles";

export type SiteNavItem = {
  id: string;
  label: string;
  href?: string;
  available: boolean;
  inSubnav: boolean;
  description: string;
};

export const SITE_NAV: SiteNavItem[] = [
  {
    id: "about",
    label: "Home",
    href: appHref(ABOUT_PATH),
    available: true,
    inSubnav: true,
    description: "Living Learning Surfaces home page.",
  },
  {
    id: "chess",
    label: "Chess",
    href: appHref(CHESS_PATH),
    available: true,
    inSubnav: true,
    description:
      "Working chess learning app — linked from this home page's sub-navigation. Interactive board, coach, and chess WebMCP tools. Open this page before teaching chess.",
  },
  {
    id: "triangles",
    label: "Triangles",
    href: appHref(TRIANGLES_PATH),
    available: true,
    inSubnav: true,
    description:
      "Working triangle geometry app — GAN constructions, figure canvas, and geometry WebMCP tools. Open this page before teaching bagrut triangles.",
  },
  {
    id: "circuits",
    label: "Circuits",
    available: false,
    inSubnav: false,
    description: "Coming later. Not available yet.",
  },
  {
    id: "chemistry",
    label: "Chemistry",
    available: false,
    inSubnav: false,
    description: "Coming later. Not available yet.",
  },
  {
    id: "music",
    label: "Music",
    available: false,
    inSubnav: false,
    description: "Coming later. Not available yet.",
  },
  {
    id: "maps",
    label: "Maps",
    available: false,
    inSubnav: false,
    description: "Coming later. Not available yet.",
  },
];

export function currentSitePageId(
  pathname = typeof window !== "undefined" ? window.location.pathname : "/"
): SitePageId {
  const route = parseAppRoute(pathname);
  if (route === "about") {
    return "about";
  }
  if (route === "triangles") {
    return "triangles";
  }
  return "chess";
}

export function parseSitePageId(value: unknown): SitePageId | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const raw = value.trim().toLowerCase();
  if (raw === "about" || raw === "home") {
    return "about";
  }
  if (raw === "chess" || raw === "play" || raw === "board") {
    return "chess";
  }
  if (raw === "triangles" || raw === "geometry" || raw === "triangle") {
    return "triangles";
  }
  return undefined;
}

export function listSitePages(pathname?: string) {
  const current = currentSitePageId(pathname);
  return {
    currentPage: current,
    subnav: SITE_NAV.filter((item) => item.inSubnav).map((item) => ({
      id: item.id,
      label: item.label,
      href: item.href,
      available: item.available,
      current: item.id === current,
      description: item.description,
    })),
    comingLater: SITE_NAV.filter((item) => !item.available).map((item) => item.label),
  };
}

function pageHref(page: SitePageId): string {
  const item = SITE_NAV.find((entry) => entry.id === page);
  if (item?.href) {
    return item.href;
  }
  if (page === "chess") {
    return appHref(CHESS_PATH);
  }
  if (page === "triangles") {
    return appHref(TRIANGLES_PATH);
  }
  return appHref(ABOUT_PATH);
}

export function navigateToSitePage(page: SitePageId): {
  success: boolean;
  message: string;
  data: { page: SitePageId; href: string; alreadyThere: boolean };
} {
  const href = pageHref(page);
  const alreadyThere = currentSitePageId() === page;
  if (!alreadyThere && typeof window !== "undefined") {
    window.history.pushState({}, "", href);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
  if (alreadyThere) {
    return {
      success: true,
      message:
        page === "chess"
          ? "Already on the chess app. Chess tools such as get-board-state and make-move are on this page."
          : page === "triangles"
            ? "Already on the triangle geometry app. Figure tools such as get-figure-state and apply-gan are on this page."
            : "Already on the home page. Call open-page with page=chess or page=triangles.",
      data: { page, href, alreadyThere: true },
    };
  }
  return {
    success: true,
    message:
      page === "chess"
        ? "Opening the chess learning app from the sub-navigation. Wait for chess tools such as get-board-state, make-move, enter-learn-mode, and create-lesson to appear, then teach on that page."
        : page === "triangles"
          ? "Opening the triangle geometry app from the sub-navigation. Wait for tools such as get-figure-state, apply-gan, and move-point to appear, then teach on that page."
          : "Opening the Living Learning Surfaces home page.",
    data: { page, href, alreadyThere: false },
  };
}
