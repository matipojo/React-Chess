import { CoachState, QuizState, SavedLesson, SavedLessonStep } from "./types";
import { normalizeCoachCopy } from "./coachParagraphs";

export type LessonStepType = "step" | "riddle";

export type LessonStepDraft = {
  title: string;
  what: string;
  why: string;
  type?: LessonStepType;
  paragraphs?: string[];
  moves?: string[];
  question?: string;
  correct?: string[];
  hint?: string;
  quizType?: QuizState["type"];
};

export function parseLessonStepType(value: unknown): LessonStepType {
  if (typeof value !== "string") {
    return "step";
  }
  const raw = value.trim().toLowerCase();
  if (
    raw === "riddle" ||
    raw === "quiz" ||
    raw === "puzzle" ||
    raw === "exam" ||
    raw === "חידה"
  ) {
    return "riddle";
  }
  return "step";
}

export function isRiddleStep(step: { kind?: SavedLessonStep["kind"] }): boolean {
  return step.kind === "riddle";
}

export type LessonSummaryDraft = {
  title?: string;
  paragraphs: string[];
};

export function isRecapPhase(phase?: CoachState["phase"] | "summary"): boolean {
  return phase === "recap" || phase === "summary";
}

export type LessonFormat = "lesson" | "showme";

/** Built-in lesson type on create-lesson. Exact enum only, not inferred from wording. */
export function parseLessonFormat(value: unknown): LessonFormat {
  return value === "showme" ? "showme" : "lesson";
}

export function isShowmePhase(phase?: CoachState["phase"]): boolean {
  return phase === "showme";
}

export function isShowmeLesson(item: { kind?: string }): boolean {
  return item.kind === "showme";
}

export function coachFromShowme(args: {
  title: string;
  body?: string;
  paragraphs?: string[];
  lesson?: number;
  moves?: string[];
  fromFen?: string;
}): CoachState {
  const copy = normalizeCoachCopy({
    body: args.body || "",
    paragraphs: args.paragraphs || [],
  });
  return {
    title: args.title.trim(),
    lessonTitle: args.title.trim(),
    body: copy.body,
    paragraphs: copy.paragraphs,
    lesson: args.lesson,
    phase: "showme",
    moves: args.moves && args.moves.length ? [...args.moves] : undefined,
    fromFen: args.fromFen,
  };
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
  isShowme?: boolean;
  stepCount?: number;
}): boolean {
  if (input.isShowme) {
    return false;
  }
  return (
    input.generatingNext ||
    input.expectsRecap ||
    input.hasLineMoves ||
    (typeof input.stepCount === "number" && input.stepCount > 1)
  );
}

export function lessonSlideCounter(input: {
  step?: number;
  totalSteps?: number;
  phase?: CoachState["phase"];
  historyIndex?: number;
  historyLength?: number;
}): { current: number; total: number } | null {
  const historyLength =
    input.historyLength && input.historyLength > 0 ? input.historyLength : 0;
  if (historyLength > 1 && typeof input.historyIndex === "number" && input.historyIndex >= 0) {
    return {
      current: Math.max(1, Math.min(input.historyIndex + 1, historyLength)),
      total: historyLength,
    };
  }
  const planned = input.totalSteps && input.totalSteps > 0 ? input.totalSteps : 0;
  const recapExtra = input.phase === "recap" && planned > 0 ? 1 : 0;
  const total = planned + recapExtra;
  if (total <= 1) {
    return null;
  }
  let current = 1;
  if (typeof input.step === "number" && input.step > 0) {
    current = input.step;
  } else if (input.phase === "recap" && planned > 0) {
    current = planned + recapExtra;
  }
  return { current: Math.max(1, Math.min(current, total)), total };
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
  if (draft.type === "riddle") {
    return {
      title: draft.title.trim() || "Riddle",
      lessonTitle: meta.lessonTitle,
      body: "",
      lesson: meta.lesson,
      step: meta.step,
      totalSteps: meta.totalSteps,
      phase: "riddle",
      fromFen: meta.fromFen,
    };
  }
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
  if (isRiddleStep(step)) {
    return {
      title: step.title,
      lessonTitle: item.title,
      body: "",
      lesson: item.number,
      step: counts.step,
      totalSteps: counts.totalSteps,
      phase: "riddle",
      fromFen: step.tfn || step.fen,
    };
  }
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
    fromFen: step.tfn || step.fen,
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
    const type = parseLessonStepType(item.type);
    const paragraphs = Array.isArray(item.paragraphs)
      ? item.paragraphs.filter((part): part is string => typeof part === "string")
      : undefined;
    const moves = Array.isArray(item.moves)
      ? item.moves.filter((part): part is string => typeof part === "string")
      : undefined;
    if (type === "riddle") {
      const question = typeof item.question === "string" ? item.question.trim() : "";
      const correct = Array.isArray(item.correct)
        ? item.correct.filter((part): part is string => typeof part === "string").map((part) => part.trim()).filter(Boolean)
        : [];
      if (!question || !correct.length) {
        return [];
      }
      const title =
        typeof item.title === "string" && item.title.trim()
          ? item.title.trim()
          : "Riddle";
      const hint = typeof item.hint === "string" ? item.hint : undefined;
      const quizType =
        item.quizType === "click-piece" ||
        item.quizType === "choose-move" ||
        item.quizType === "click-square"
          ? item.quizType
          : undefined;
      return [{ title, what: "", why: "", type, paragraphs, moves, question, correct, hint, quizType }];
    }
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const what = typeof item.what === "string" ? item.what.trim() : "";
    const why = typeof item.why === "string" ? item.why.trim() : "";
    if (!title || !what || !why) {
      return [];
    }
    return [{ title, what, why, type, paragraphs, moves }];
  });
}
