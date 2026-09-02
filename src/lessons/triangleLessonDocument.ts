import {
  defaultScalene,
  figuresEqual,
  hasTriangle,
} from "../geometry/figure";
import { commandSatisfied, parseGanCommand } from "../geometry/gan";
import { applyGanList, resolveStepGan, tfnAfterCommands } from "../geometry/stepPlay";
import { FIGURE_TEMPLATES, figureFromTemplate, startFigure } from "../geometry/templates";
import { extractPlayableGan } from "../geometry/text-links";
import { parseTfn, serializeTfn } from "../geometry/tfn";
import { Figure } from "../geometry/types";
import {
  coachFromSavedStep,
  coachFromSummary,
  teachingSteps,
} from "./lessonCopy";
import { contentQuiz, contentStep } from "./lessonDocument";
import { CoachState, QuizState, SavedLesson } from "./types";

export const DEFAULT_TRIANGLE_TFN = FIGURE_TEMPLATES.scalene;

export type TriangleLessonSessionSlide = {
  tfn: string;
  coach: CoachState | null;
  quiz: QuizState | null;
  ply: number;
};

function goalCopyTexts(item: {
  title?: string;
  body?: string;
  paragraphs?: string[];
}): string[] {
  const texts: string[] = [];
  if (item.title) {
    texts.push(item.title);
  }
  if (item.body) {
    texts.push(item.body);
  }
  (item.paragraphs || []).forEach((part) => texts.push(part));
  return texts;
}

export function triangleCommandsInText(texts: string[]): string[] {
  const found: string[] = [];
  texts.forEach((text) => {
    extractPlayableGan(text).forEach((cmd) => {
      const parsed = parseGanCommand(cmd);
      if (parsed && parsed.type === "triangle" && found.indexOf(cmd) < 0) {
        found.push(cmd);
      }
    });
  });
  return found;
}

function isDefaultSingleTriangle(figure: Figure): boolean {
  return (
    figure.triangles.length === 1 &&
    hasTriangle(figure, "A", "B", "C") &&
    !figure.points.D &&
    !figure.points.E &&
    !figure.points.F &&
    (figuresEqual(figure, startFigure("scalene")) || figuresEqual(figure, defaultScalene()))
  );
}

export function ensureGoalTriangles(
  figure: Figure,
  item: { title?: string; body?: string; paragraphs?: string[] }
): Figure {
  const wanted = triangleCommandsInText(goalCopyTexts(item));
  const missing = wanted.filter((cmd) => !commandSatisfied(figure, cmd));
  if (!missing.length) {
    return figure;
  }
  const wantsAbc = wanted.indexOf("△ABC") >= 0;
  const wantsDef = wanted.indexOf("△DEF") >= 0;
  if (wantsAbc && wantsDef && isDefaultSingleTriangle(figure)) {
    const pair = figureFromTemplate("two-triangles");
    if (pair) {
      return pair;
    }
  }
  return applyGanList(figure, missing);
}

function hasGoalCopy(item: SavedLesson): boolean {
  return Boolean(
    item.body ||
    (item.paragraphs && item.paragraphs.length) ||
    (item.kind === "custom" && item.title)
  );
}

export function shouldApplySavedStepTfn(input: {
  stepTfn?: string;
  currentTfn: string;
  startingTfn: string;
  isFirst: boolean;
}): boolean {
  if (!input.stepTfn) {
    return false;
  }
  if (input.isFirst) {
    return true;
  }
  return !(input.stepTfn === input.startingTfn && input.currentTfn !== input.startingTfn);
}

export function projectTriangleLessonSession(
  item: SavedLesson,
  startingTfn = DEFAULT_TRIANGLE_TFN
): TriangleLessonSessionSlide[] {
  const steps = item.steps && item.steps.length ? item.steps.map(contentStep) : [];
  const teaching = teachingSteps(steps);
  const rawStart = (teaching[0] && teaching[0].tfn) || item.tfn || startingTfn;
  let cursor = ensureGoalTriangles(parseTfn(rawStart), item);
  let cursorTfn = serializeTfn(cursor);
  const slides: TriangleLessonSessionSlide[] = [];

  if (hasGoalCopy(item)) {
    slides.push({
      tfn: cursorTfn,
      coach: {
        title: item.title,
        lessonTitle: item.title,
        body: item.body,
        paragraphs: item.paragraphs,
        lesson: item.number,
        phase: "goal",
      },
      quiz: null,
      ply: 0,
    });
  }

  teaching.forEach((step, index) => {
    if (
      (step.kind === "riddle" && Boolean(step.tfn)) ||
      shouldApplySavedStepTfn({
        stepTfn: step.tfn,
        currentTfn: cursorTfn,
        startingTfn: rawStart,
        isFirst: index === 0,
      })
    ) {
      cursor = parseTfn(step.tfn as string);
    }
    cursor = ensureGoalTriangles(cursor, item);
    cursorTfn = serializeTfn(cursor);
    slides.push({
      tfn: cursorTfn,
      coach: {
        ...coachFromSavedStep(item, step, teaching),
        fromFen: cursorTfn,
      },
      quiz: contentQuiz(step.quiz) || null,
      ply: index + 1,
    });
    const commands = resolveStepGan(step.what, step.moves);
    if (commands.length) {
      cursor = applyGanList(cursor, commands);
      cursorTfn = serializeTfn(cursor);
    }
  });

  if (item.recap && item.recap.paragraphs && item.recap.paragraphs.length) {
    slides.push({
      tfn: cursorTfn,
      coach: coachFromSummary(item.recap, {
        lessonTitle: item.title,
        lesson: item.number,
        totalSteps: teaching.length,
      }),
      quiz: null,
      ply: teaching.length + 1,
    });
  }

  if (slides.length === 0) {
    slides.push({
      tfn: cursorTfn,
      coach: {
        title: item.title,
        lessonTitle: item.title,
        body: item.body,
        paragraphs: item.paragraphs,
        lesson: item.number,
      },
      quiz: contentQuiz(item.quiz) || null,
      ply: 0,
    });
  }

  return slides;
}

export function tfnAfterTeaching(
  item: SavedLesson,
  startingTfn = DEFAULT_TRIANGLE_TFN
): string {
  const slides = projectTriangleLessonSession(item, startingTfn);
  const last = slides[slides.length - 1];
  if (!last) {
    return startingTfn;
  }
  if (last.coach?.phase === "recap" || last.coach?.phase === "goal") {
    return last.tfn;
  }
  const moves = resolveStepGan(last.coach?.what, last.coach?.moves);
  if (!moves.length) {
    return last.tfn;
  }
  return tfnAfterCommands(last.tfn, moves);
}
