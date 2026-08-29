import { SavedLesson } from "./types";

export const USER_CATALOG_KEY = "webmcp-chess-user-lessons";

export function lessonSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "lesson";
}

function isSavedLesson(value: unknown): value is SavedLesson {
  if (!value || typeof value !== "object") {
    return false;
  }
  const item = value as SavedLesson;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.body === "string" &&
    typeof item.savedAt === "number" &&
    (item.kind === "game" || item.kind === "piece" || item.kind === "custom")
  );
}

function writeCatalog(lessons: SavedLesson[]) {
  localStorage.setItem(USER_CATALOG_KEY, JSON.stringify(lessons));
}

export function readUserCatalog(): SavedLesson[] {
  try {
    const raw = localStorage.getItem(USER_CATALOG_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter(isSavedLesson)
      .sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

export function upsertUserLesson(
  lesson: Omit<SavedLesson, "savedAt">
): SavedLesson[] {
  const nextItem: SavedLesson = { ...lesson, savedAt: Date.now() };
  const current = readUserCatalog().filter((item) => item.id !== nextItem.id);
  current.unshift(nextItem);
  writeCatalog(current);
  return current;
}

export function findUserLesson(id: string): SavedLesson | undefined {
  const needle = id.toLowerCase().trim();
  return readUserCatalog().find(
    (item) =>
      item.id.toLowerCase() === needle ||
      item.title.toLowerCase() === needle ||
      (item.gameId && item.gameId.toLowerCase() === needle)
  );
}

export function removeUserLesson(id: string): SavedLesson[] {
  const current = readUserCatalog().filter((item) => item.id !== id);
  writeCatalog(current);
  return current;
}
