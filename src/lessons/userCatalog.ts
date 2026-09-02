import { isTeachingStep } from "./lessonCopy";
import { contentLesson, contentStep } from "./lessonDocument";
import { SavedLesson, SavedLessonStep } from "./types";

export const USER_CATALOG_KEY = "webmcp-chess-user-lessons";
export const TRIANGLE_CATALOG_KEY = "webmcp-triangle-user-lessons";

export function lessonSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "lesson";
}

export function customLessonId(lessonNumber: number): string {
  return `custom:lesson-${lessonNumber}`;
}

export function parseCustomLessonNumber(id: string): number | undefined {
  const match = /^custom:lesson-(\d+)$/.exec(id);
  if (!match) {
    return undefined;
  }
  const value = Number(match[1]);
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function isSavedLessonStep(value: unknown): value is SavedLessonStep {
  if (!value || typeof value !== "object") {
    return false;
  }
  const item = value as SavedLessonStep;
  return typeof item.title === "string" && typeof item.body === "string";
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
    (item.kind === "game" ||
      item.kind === "piece" ||
      item.kind === "custom" ||
      item.kind === "showme")
  );
}

function legacyAsStep(item: SavedLesson): SavedLessonStep {
  return contentStep({
    title: item.title,
    body: item.body,
    paragraphs: item.paragraphs,
    fen: item.fen,
    tfn: item.tfn,
    highlights: item.highlights,
    arrows: item.arrows,
    quiz: item.quiz,
  });
}

export function lessonSteps(item: SavedLesson): SavedLessonStep[] {
  if (Array.isArray(item.steps)) {
    return item.steps.filter(isSavedLessonStep).map(contentStep);
  }
  return [legacyAsStep(item)];
}

function writeCatalog(lessons: SavedLesson[], storageKey = USER_CATALOG_KEY) {
  localStorage.setItem(storageKey, JSON.stringify(lessons));
}

function assignLessonNumbers(lessons: SavedLesson[]): SavedLesson[] {
  const used = new Set<number>();
  for (const item of lessons) {
    const fromField =
      typeof item.number === "number" && item.number > 0 ? item.number : undefined;
    const fromId = parseCustomLessonNumber(item.id);
    const number = fromField || fromId;
    if (number) {
      used.add(number);
    }
  }
  let next = 1;
  const takeNext = () => {
    while (used.has(next)) {
      next += 1;
    }
    used.add(next);
    return next;
  };
  return lessons.map((item) => {
    if (typeof item.number === "number" && item.number > 0) {
      return item;
    }
    const fromId = parseCustomLessonNumber(item.id);
    if (fromId) {
      return { ...item, number: fromId };
    }
    if (item.kind !== "custom") {
      return item;
    }
    return { ...item, number: takeNext() };
  });
}

export function readUserCatalog(storageKey = USER_CATALOG_KEY): SavedLesson[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    const lessons = parsed
      .filter(isSavedLesson)
      .map((item) => ({ ...contentLesson(item), savedAt: item.savedAt }))
      .sort((a, b) => b.savedAt - a.savedAt);
    return assignLessonNumbers(lessons);
  } catch {
    return [];
  }
}

export function nextLessonNumber(
  lessons?: SavedLesson[],
  storageKey = USER_CATALOG_KEY
): number {
  const list = lessons || readUserCatalog(storageKey);
  let max = 0;
  for (const item of list) {
    const n = item.number || parseCustomLessonNumber(item.id) || 0;
    if (n > max) {
      max = n;
    }
  }
  return max + 1;
}

export function createCatalogLesson(
  args: {
    title: string;
    body?: string;
    paragraphs?: string[];
    kind?: SavedLesson["kind"];
    tfn?: string;
    fen?: string;
  },
  storageKey = USER_CATALOG_KEY
): SavedLesson {
  const number = nextLessonNumber(undefined, storageKey);
  upsertUserLesson(
    {
      id: customLessonId(number),
      kind: args.kind || "custom",
      title: args.title.trim() || "Lesson",
      body: args.body || "",
      paragraphs: args.paragraphs,
      number,
      steps: [],
      tfn: args.tfn,
      fen: args.fen,
    },
    storageKey
  );
  return findUserLessonByNumber(number, storageKey)!;
}

export function upsertUserLesson(
  lesson: Omit<SavedLesson, "savedAt">,
  storageKey = USER_CATALOG_KEY
): SavedLesson[] {
  const nextItem: SavedLesson = { ...contentLesson(lesson), savedAt: Date.now() };
  const current = readUserCatalog(storageKey).filter((item) => item.id !== nextItem.id);
  current.unshift(nextItem);
  writeCatalog(current, storageKey);
  return current;
}

export function findUserLesson(
  id: string,
  storageKey = USER_CATALOG_KEY
): SavedLesson | undefined {
  const needle = id.toLowerCase().trim();
  return readUserCatalog(storageKey).find(
    (item) =>
      item.id.toLowerCase() === needle ||
      item.title.toLowerCase() === needle ||
      (item.gameId && item.gameId.toLowerCase() === needle) ||
      (item.number !== undefined && String(item.number) === needle)
  );
}

export function findUserLessonByNumber(
  lessonNumber: number,
  storageKey = USER_CATALOG_KEY
): SavedLesson | undefined {
  return readUserCatalog(storageKey).find(
    (item) =>
      item.number === lessonNumber ||
      parseCustomLessonNumber(item.id) === lessonNumber
  );
}

export type UpsertLessonStepInput = {
  lessonNumber: number;
  step: SavedLessonStep;
  /** 1-based. Omit to append a new step. */
  stepNumber?: number;
  /** Update the current/last step instead of adding one. */
  patch?: boolean;
  lessonTitle?: string;
  kind?: SavedLesson["kind"];
  gameId?: string;
  moves?: string[];
  notes?: SavedLesson["notes"];
  piece?: string;
  square?: string;
  color?: string;
  storageKey?: string;
};

export function upsertLessonStep(input: UpsertLessonStepInput): SavedLesson[] {
  const storageKey = input.storageKey || USER_CATALOG_KEY;
  const existing = findUserLessonByNumber(input.lessonNumber, storageKey);
  const steps = existing ? lessonSteps(existing) : [];
  const incoming = contentStep(input.step);

  let index: number;
  if (input.patch) {
    index = steps.length - 1;
    for (let i = steps.length - 1; i >= 0; i--) {
      if (isTeachingStep(steps[i])) {
        index = i;
        break;
      }
    }
    if (steps.length === 0) {
      steps.push(incoming);
      index = 0;
    } else {
      steps[index] = incoming;
    }
  } else if (typeof input.stepNumber === "number" && input.stepNumber > 0) {
    index = input.stepNumber - 1;
    if (index < steps.length) {
      steps[index] = incoming;
    } else {
      steps.push(incoming);
      index = steps.length - 1;
    }
  } else {
    const teaching = steps.filter(
      (item) => item.kind !== "summary" && item.kind !== "recap"
    );
    teaching.push(incoming);
    steps.length = 0;
    steps.push(...teaching);
    index = steps.length - 1;
  }

  const currentStep = steps[index];
  const lessonTitle =
    input.lessonTitle || existing?.title || currentStep.title;
  const nextItem: Omit<SavedLesson, "savedAt"> = {
    id: existing ? existing.id : customLessonId(input.lessonNumber),
    kind: input.kind || existing?.kind || "custom",
    title: lessonTitle,
    body: existing?.body || currentStep.body,
    paragraphs: existing?.paragraphs,
    recap: existing?.recap,
    number: input.lessonNumber,
    steps: steps.map(contentStep),
    gameId: input.gameId !== undefined ? input.gameId : existing?.gameId,
    moves: input.moves !== undefined ? input.moves : existing?.moves,
    notes: input.notes !== undefined ? input.notes : existing?.notes,
    piece: input.piece !== undefined ? input.piece : existing?.piece,
    square: input.square !== undefined ? input.square : existing?.square,
    color: input.color !== undefined ? input.color : existing?.color,
    tfn: existing?.tfn,
    fen: existing?.fen,
  };

  return upsertUserLesson(nextItem, storageKey);
}

export function setLessonRecap(
  lessonNumber: number,
  recap: { title?: string; paragraphs: string[]; body?: string },
  storageKey = USER_CATALOG_KEY
): SavedLesson[] {
  const existing = findUserLessonByNumber(lessonNumber, storageKey);
  if (!existing) {
    return readUserCatalog(storageKey);
  }
  const { savedAt: _savedAt, ...rest } = existing;
  return upsertUserLesson(
    {
      ...rest,
      recap: {
        title: recap.title,
        paragraphs: recap.paragraphs,
        body: recap.body || recap.paragraphs.join("\n\n"),
      },
    },
    storageKey
  );
}

export function removeUserLesson(
  id: string,
  storageKey = USER_CATALOG_KEY
): SavedLesson[] {
  const current = readUserCatalog(storageKey).filter((item) => item.id !== id);
  writeCatalog(current, storageKey);
  return current;
}
