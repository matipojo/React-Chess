import { CoachState, SavedLesson, SavedLessonStep } from "./types";
import { normalizeCoachCopy } from "./coachParagraphs";

export type LessonStepDraft = {
  title: string;
  what: string;
  why: string;
  paragraphs?: string[];
  moves?: string[];
};

export type LessonSummaryDraft = {
  title?: string;
  paragraphs: string[];
};

export function isRecapPhase(phase?: CoachState["phase"] | "summary"): boolean {
  return phase === "recap" || phase === "summary";
}

export function isTeachingStep(step: SavedLessonStep): boolean {
  return step.kind !== "recap" && step.kind !== "summary";
}

export function teachingSteps(steps: SavedLessonStep[]): SavedLessonStep[] {
  return steps.filter(isTeachingStep);
}

export function lessonExpectsRecap(
  teachingCount: number,
  recap?: { paragraphs?: string[] } | null
): boolean {
  if (recap && recap.paragraphs && recap.paragraphs.length > 0) {
    return true;
  }
  return teachingCount > 1;
}

export function shouldShowLessonNav(input: {
  expectsRecap: boolean;
  generatingNext: boolean;
  hasLineMoves: boolean;
}): boolean {
  return input.generatingNext || input.expectsRecap || input.hasLineMoves;
}

export function teachingStepIndex(steps: SavedLessonStep[], index: number): {
  step?: number;
  totalSteps?: number;
} {
  const teaching = teachingSteps(steps);
  const current = steps[index];
  if (!current || !isTeachingStep(current)) {
    return { totalSteps: teaching.length || undefined };
  }
  const position = teaching.indexOf(current);
  return {
    step: position >= 0 ? position + 1 : undefined,
    totalSteps: teaching.length || undefined,
  };
}

export function buildStepParagraphs(draft: {
  what?: string;
  why?: string;
  paragraphs?: string[];
}): string[] {
  const extra = (draft.paragraphs || []).map((item) => item.trim()).filter(Boolean);
  const what = draft.what ? draft.what.trim() : "";
  const why = draft.why ? draft.why.trim() : "";
  const parts = [why, what, ...extra].filter(Boolean);
  return normalizeCoachCopy({ body: "", paragraphs: parts }).paragraphs;
}

export function coachFromDraft(
  draft: LessonStepDraft,
  meta: {
    lessonTitle: string;
    lesson?: number;
    step?: number;
    totalSteps?: number;
    fromFen?: string;
    moves?: string[];
  }
): CoachState {
  const extra = (draft.paragraphs || []).map((item) => item.trim()).filter(Boolean);
  const paragraphs = buildStepParagraphs({
    what: draft.what,
    why: draft.why,
    paragraphs: extra,
  });
  const copy = normalizeCoachCopy({ body: "", paragraphs });
  return {
    title: draft.title.trim(),
    lessonTitle: meta.lessonTitle,
    body: copy.body,
    paragraphs: extra.length ? extra : undefined,
    what: draft.what.trim(),
    why: draft.why.trim(),
    lesson: meta.lesson,
    step: meta.step,
    totalSteps: meta.totalSteps,
    phase: "step",
    fromFen: meta.fromFen,
    moves: meta.moves && meta.moves.length ? [...meta.moves] : undefined,
  };
}

export function coachFromSummary(
  summary: LessonSummaryDraft,
  meta: { lessonTitle: string; lesson?: number; totalSteps?: number }
): CoachState {
  const paragraphs = normalizeCoachCopy({
    body: "",
    paragraphs: summary.paragraphs,
  }).paragraphs;
  const copy = normalizeCoachCopy({ body: "", paragraphs });
  return {
    title: (summary.title || "Recap").trim(),
    lessonTitle: meta.lessonTitle,
    body: copy.body,
    paragraphs: copy.paragraphs,
    lesson: meta.lesson,
    totalSteps: meta.totalSteps,
    phase: "recap",
  };
}

export function coachFromSavedStep(
  item: SavedLesson,
  step: SavedLessonStep,
  steps: SavedLessonStep[]
): CoachState {
  const index = steps.indexOf(step);
  const counts = teachingStepIndex(steps, index);
  if (!isTeachingStep(step)) {
    return {
      title: step.title,
      lessonTitle: item.title,
      body: step.body,
      paragraphs: step.paragraphs,
      lesson: item.number,
      totalSteps: counts.totalSteps,
      phase: "recap",
    };
  }
  const paragraphs =
    step.what || step.why
      ? (step.paragraphs || []).filter(Boolean)
      : step.paragraphs || [];
  const copy = normalizeCoachCopy({
    body: step.body,
    paragraphs: buildStepParagraphs({
      what: step.what,
      why: step.why,
      paragraphs: step.paragraphs,
    }),
  });
  return {
    title: step.title,
    lessonTitle: item.title,
    body: copy.body,
    paragraphs: step.what || step.why ? paragraphs : copy.paragraphs,
    what: step.what,
    why: step.why,
    lesson: item.number,
    step: counts.step,
    totalSteps: counts.totalSteps,
    phase: "step",
    fromFen: step.fen,
    moves: step.moves,
  };
}

export function parseSummaryDraft(value: unknown): LessonSummaryDraft | null {
  if (typeof value === "string") {
    const text = value.trim();
    return text ? { paragraphs: [text] } : null;
  }
  if (Array.isArray(value)) {
    const cleaned = value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean);
    return cleaned.length ? { paragraphs: cleaned } : null;
  }
  if (!value || typeof value !== "object") {
    return null;
  }
  const item = value as { title?: unknown; paragraphs?: unknown; body?: unknown };
  const paragraphs = Array.isArray(item.paragraphs)
    ? item.paragraphs.filter((entry): entry is string => typeof entry === "string")
    : typeof item.body === "string"
      ? [item.body]
      : [];
  const cleaned = paragraphs.map((entry) => entry.trim()).filter(Boolean);
  if (!cleaned.length) {
    return null;
  }
  return {
    title: typeof item.title === "string" ? item.title : undefined,
    paragraphs: cleaned,
  };
}

export function parseStepDrafts(value: unknown): LessonStepDraft[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }
    const item = entry as Record<string, unknown>;
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const what = typeof item.what === "string" ? item.what.trim() : "";
    const why = typeof item.why === "string" ? item.why.trim() : "";
    if (!title || !what || !why) {
      return [];
    }
    const paragraphs = Array.isArray(item.paragraphs)
      ? item.paragraphs.filter((part): part is string => typeof part === "string")
      : undefined;
    const moves = Array.isArray(item.moves)
      ? item.moves.filter((part): part is string => typeof part === "string")
      : undefined;
    return [{ title, what, why, paragraphs, moves }];
  });
}
