import { boardToFen, startingLearnBoard } from "../utils/board-setup";
import {
  coachFromSavedStep,
  coachFromShowme,
  coachFromSummary,
  isShowmeLesson,
  teachingSteps,
} from "./lessonCopy";
import { fenAfterMoves, resolveStepMoves, shouldApplySavedStepFen } from "./stepPlay";
import {
  BoardArrow,
  BoardHighlight,
  CoachState,
  QuizState,
  SavedLesson,
  SavedLessonStep,
} from "./types";

export type LessonSessionSlide = {
  fen: string;
  coach: CoachState | null;
  highlights: BoardHighlight[];
  arrows: BoardArrow[];
  quiz: QuizState | null;
  ply: number;
};

function cloneMarks(marks?: BoardHighlight[]): BoardHighlight[] | undefined {
  if (!marks) {
    return undefined;
  }
  const teaching = marks.filter((item) => item.kind !== "peek");
  return teaching.length ? teaching.map((item) => ({ ...item })) : undefined;
}

function cloneArrows(arrows?: BoardArrow[]): BoardArrow[] | undefined {
  if (!arrows || arrows.length === 0) {
    return undefined;
  }
  return arrows.map((item) => ({ ...item }));
}

export function contentQuiz(quiz?: QuizState | null): QuizState | undefined {
  if (!quiz) {
    return undefined;
  }
  return {
    question: quiz.question,
    type: quiz.type,
    correct: [...quiz.correct],
    hint: quiz.hint,
  };
}

export function catalogStepKind(kind?: SavedLessonStep["kind"]): SavedLessonStep["kind"] {
  if (kind === "recap" || kind === "summary" || kind === "riddle") {
    return kind;
  }
  return "step";
}

export function contentStep(step: SavedLessonStep): SavedLessonStep {
  const kind = catalogStepKind(step.kind);
  return {
    title: step.title,
    body: step.body,
    paragraphs: step.paragraphs ? step.paragraphs.filter(Boolean) : undefined,
    what: step.what,
    why: step.why,
    kind,
    moves: step.moves && step.moves.length ? [...step.moves] : undefined,
    fen: step.fen,
    highlights: cloneMarks(step.highlights),
    arrows: cloneArrows(step.arrows),
    quiz: contentQuiz(step.quiz),
  };
}

export function contentLesson(
  lesson: Omit<SavedLesson, "savedAt">
): Omit<SavedLesson, "savedAt"> {
  const steps = Array.isArray(lesson.steps)
    ? lesson.steps.map(contentStep)
    : undefined;
  const teaching = steps ? teachingSteps(steps) : [];
  const { activeStep: _activeStep, ply: _ply, ...rest } = lesson as SavedLesson & {
    activeStep?: number;
    ply?: number;
  };
  const hasBeats = Boolean(steps && steps.length > 0);
  return {
    ...rest,
    steps,
    recap: lesson.recap
      ? {
          title: lesson.recap.title,
          body: lesson.recap.body,
          paragraphs: [...lesson.recap.paragraphs],
        }
      : undefined,
    fen: (teaching[0] && teaching[0].fen) || lesson.fen,
    highlights: hasBeats ? undefined : cloneMarks(lesson.highlights),
    arrows: hasBeats ? undefined : cloneArrows(lesson.arrows),
    quiz: hasBeats ? undefined : contentQuiz(lesson.quiz),
    ply: undefined,
  };
}

function hasGoalCopy(item: SavedLesson): boolean {
  return Boolean(item.body || (item.paragraphs && item.paragraphs.length));
}

export function lastTeachingSlideIndex(slides: LessonSessionSlide[]): number {
  let last = 0;
  slides.forEach((slide, index) => {
    if (
      slide.coach?.phase === "step" ||
      slide.coach?.phase === "riddle" ||
      slide.coach?.phase === "showme"
    ) {
      last = index;
    }
  });
  return last;
}

export function projectLessonSession(
  item: SavedLesson,
  startingFen = boardToFen(startingLearnBoard())
): LessonSessionSlide[] {
  if (isShowmeLesson(item)) {
    return [
      {
        fen: item.fen || startingFen,
        coach: coachFromShowme({
          title: item.title,
          body: item.body,
          paragraphs: item.paragraphs,
          lesson: item.number,
          moves: item.moves,
          fromFen: item.fen,
        }),
        highlights: cloneMarks(item.highlights) || [],
        arrows: cloneArrows(item.arrows) || [],
        quiz: null,
        ply: 0,
      },
    ];
  }

  const steps = item.steps && item.steps.length ? item.steps.map(contentStep) : [];
  const teaching = teachingSteps(steps);
  const startFen = (teaching[0] && teaching[0].fen) || item.fen || startingFen;
  let cursorFen = startFen;
  const slides: LessonSessionSlide[] = [];

  if (hasGoalCopy(item)) {
    slides.push({
      fen: startFen,
      coach: {
        title: item.title,
        lessonTitle: item.title,
        body: item.body,
        paragraphs: item.paragraphs,
        lesson: item.number,
        phase: "goal",
      },
      highlights: [],
      arrows: [],
      quiz: null,
      ply: 0,
    });
  }

  teaching.forEach((step, index) => {
    if (
      shouldApplySavedStepFen({
        stepFen: step.fen,
        currentFen: cursorFen,
        startingFen,
        isFirst: index === 0,
      })
    ) {
      cursorFen = step.fen as string;
    }
    const coach = {
      ...coachFromSavedStep(item, step, teaching),
      fromFen: cursorFen,
    };
    slides.push({
      fen: cursorFen,
      coach,
      highlights: cloneMarks(step.highlights) || [],
      arrows: cloneArrows(step.arrows) || [],
      quiz: contentQuiz(step.quiz) || null,
      ply: index + 1,
    });
    const moves = resolveStepMoves(step.what, step.moves);
    if (moves.length) {
      const after = fenAfterMoves(cursorFen, moves);
      if (after) {
        cursorFen = after;
      }
    }
  });

  if (item.recap && item.recap.paragraphs && item.recap.paragraphs.length) {
    slides.push({
      fen: cursorFen,
      coach: coachFromSummary(item.recap, {
        lessonTitle: item.title,
        lesson: item.number,
        totalSteps: teaching.length,
      }),
      highlights: [],
      arrows: [],
      quiz: null,
      ply: teaching.length + 1,
    });
  }

  if (slides.length === 0) {
    slides.push({
      fen: startFen,
      coach: {
        title: item.title,
        lessonTitle: item.title,
        body: item.body,
        paragraphs: item.paragraphs,
        lesson: item.number,
      },
      highlights: cloneMarks(item.highlights) || [],
      arrows: cloneArrows(item.arrows) || [],
      quiz: contentQuiz(item.quiz) || null,
      ply: 0,
    });
  }

  return slides;
}
