import { ABOUT_HASH, PLAY_HASH, parseAppRoute } from "./appRoute";

export type SitePageId = "about" | "chess";

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
    href: ABOUT_HASH,
    available: true,
    inSubnav: true,
    description: "Living Learning Surfaces home page.",
  },
  {
    id: "chess",
    label: "Chess",
    href: PLAY_HASH,
    available: true,
    inSubnav: true,
    description:
      "Working chess learning app — the second page, linked from this home page's sub-navigation. Interactive board, coach, and chess WebMCP tools. Open this page before teaching chess.",
  },
  {
    id: "geometry",
    label: "Geometry",
    available: false,
    inSubnav: false,
    description: "Coming later. Not available yet.",
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
  hash = typeof window !== "undefined" ? window.location.hash : ""
): SitePageId {
  return parseAppRoute(hash) === "play" ? "chess" : "about";
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
  return undefined;
}

export function listSitePages(hash?: string) {
  const current = currentSitePageId(hash);
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

export function navigateToSitePage(page: SitePageId): {
  success: boolean;
  message: string;
  data: { page: SitePageId; href: string; alreadyThere: boolean };
} {
  const item = SITE_NAV.find((entry) => entry.id === page);
  const href = item?.href || (page === "chess" ? PLAY_HASH : ABOUT_HASH);
  const alreadyThere = currentSitePageId() === page;
  if (!alreadyThere && typeof window !== "undefined") {
    window.location.hash = href;
  }
  if (alreadyThere) {
    return {
      success: true,
      message:
        page === "chess"
          ? "Already on the chess app. Chess tools such as get-board-state and make-move are on this page."
          : "Already on the home page. Call open-page with page=chess to open the chess app in the sub-navigation.",
      data: { page, href, alreadyThere: true },
    };
  }
  return {
    success: true,
    message:
      page === "chess"
        ? "Opening the chess learning app (second page, from the sub-navigation). Wait for chess tools such as get-board-state, make-move, enter-learn-mode, and create-lesson to appear, then teach on that page."
        : "Opening the Living Learning Surfaces home page.",
    data: { page, href, alreadyThere: false },
  };
}
