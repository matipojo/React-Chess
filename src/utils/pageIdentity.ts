import { AppRoute, appBasePath, appHref } from "./appRoute";

export type PageIdentity = {
  title: string;
  icon: string;
  iconType: string;
};

const PAGE_ICONS: Record<AppRoute, { title: string; file: string; type: string }> = {
  about: {
    title: "Generative Learning",
    file: "favicon-home.svg",
    type: "image/svg+xml",
  },
  chess: {
    title: "Chess · Generative Learning",
    file: "favicon-chess.svg",
    type: "image/svg+xml",
  },
  triangles: {
    title: "Triangles · Generative Learning",
    file: "favicon-triangles.svg",
    type: "image/svg+xml",
  },
};

export function publicAssetHref(
  file: string,
  publicUrl = typeof process !== "undefined" ? process.env.PUBLIC_URL || "" : ""
): string {
  const name = file.replace(/^\//, "");
  return appHref(`/${name}`, appBasePath(publicUrl));
}

export function pageIdentity(
  route: AppRoute,
  publicUrl = typeof process !== "undefined" ? process.env.PUBLIC_URL || "" : ""
): PageIdentity {
  const spec = PAGE_ICONS[route];
  return {
    title: spec.title,
    icon: publicAssetHref(spec.file, publicUrl),
    iconType: spec.type,
  };
}

function iconLinks(doc: Document) {
  return Array.from(doc.querySelectorAll("link[rel='icon'], link[rel='shortcut icon']"));
}

export function applyPageIdentity(route: AppRoute, doc: Document = document): PageIdentity {
  const identity = pageIdentity(route);
  doc.title = identity.title;
  const head = doc.head;
  if (!head) {
    return identity;
  }
  const existing = iconLinks(doc);
  const current = existing.find((el) => el.getAttribute("href") === identity.icon);
  if (current) {
    current.setAttribute("rel", "icon");
    current.setAttribute("type", identity.iconType);
    existing.forEach((el) => {
      if (el !== current) {
        el.parentNode?.removeChild(el);
      }
    });
    return identity;
  }
  existing.forEach((el) => el.parentNode?.removeChild(el));
  const link = doc.createElement("link");
  link.id = "app-favicon";
  link.setAttribute("rel", "icon");
  link.setAttribute("type", identity.iconType);
  link.setAttribute("href", identity.icon);
  head.appendChild(link);
  return identity;
}
