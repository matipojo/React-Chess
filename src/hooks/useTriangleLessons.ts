import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { allObjectIds, cloneFigure, defaultScalene, moveFreePoint } from "../geometry/figure";
import { applyGan, parseGanCommand } from "../geometry/gan";
import { ganAnswerIsCorrect, missingQuizTargets } from "../geometry/hitTest";
import { figureSummary, measureFigure } from "../geometry/measure";
import { COACH_GAN_RULE } from "../geometry/notation";
import { coachPlayGan, resolveStepGan } from "../geometry/stepPlay";
import { FIGURE_TEMPLATES, figureFromTemplate, startFigure, templateNames } from "../geometry/templates";
import { parseTfn, serializeTfn } from "../geometry/tfn";
import { figureTransitionAnimation } from "../geometry/figureTransition";
import { Figure, FigureAnimation, Vec } from "../geometry/types";
import {
  coachFromDraft,
  isRecapPhase,
  lessonExpectsRecap,
  parseLessonStepType,
  teachingSteps,
  keptPlayheadIndex,
  CATALOG_LIVE_FROZEN_MESSAGE,
} from "../lessons/lessonCopy";
import { normalizeCoachCopy } from "../lessons/coachParagraphs";
import {
  formatFigureQuizIncorrectFeedback,
  formatFigureQuizTimeoutFeedback,
  formatQuizCorrectFeedback,
  QUIZ_TIMEOUT_MS,
  QUIZ_TIMEOUT_SECONDS,
} from "../lessons/quizCopy";
import {
  ensureGoalTriangles,
  projectTriangleLessonSession,
  tfnAfterTeaching,
} from "../lessons/triangleLessonDocument";
import {
  liveQuizFromSlide,
  quizForRestoredSlide,
} from "../lessons/lessonDocument";
import {
  CoachState,
  QuizResult,
  QuizState,
  SavedLesson,
  SavedLessonStep,
} from "../lessons/types";
import {
  createCatalogLesson,
  findUserLesson,
  findUserLessonByNumber,
  lessonSteps,
  readUserCatalog,
  removeUserLesson,
  setLessonRecap,
  TRIANGLE_CATALOG_KEY,
  upsertLessonStep,
  upsertUserLesson,
} from "../lessons/userCatalog";

type Snapshot = {
  figure: Figure;
  coach: CoachState | null;
  quiz: QuizState | null;
};

function fallbackPointerAnimation(before: Figure, after: Figure): FigureAnimation | undefined {
  const names = Object.keys(after.points);
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const prev = before.points[name];
    const next = after.points[name];
    if (prev && next && prev.free && (prev.x !== next.x || prev.y !== next.y)) {
      return {
        type: "move",
        name,
        from: { x: prev.x, y: prev.y },
        to: { x: next.x, y: next.y },
      };
    }
  }
  const first = names[0] && after.points[names[0]];
  if (first) {
    return { type: "draw", from: first, to: first };
  }
  return undefined;
}

function cloneCoach(coach: CoachState | null): CoachState | null {
  return coach ? { ...coach, paragraphs: coach.paragraphs ? [...coach.paragraphs] : undefined, moves: coach.moves ? [...coach.moves] : undefined } : null;
}

function revealQuizTargets(figure: Figure, correct: string[]): Figure {
  let next = cloneFigure(figure);
  const wantsCentroid = correct.some((token) => {
    const n = token.trim().replace(/\s/g, "");
    return n === "G" || /^g\(△?[A-Z]{3}\)$/i.test(n);
  });
  if (wantsCentroid && !next.points.G && next.triangles[0]) {
    const tri = next.triangles[0];
    const labeled = applyGan(next, "g(△" + tri.join("") + ")");
    if (!labeled.error) {
      next = labeled.figure;
    }
  }
  next.highlights = correct.slice();
  return next;
}

function applyRightMarks(figure: Figure, what?: string, moves?: string[]): Figure {
  let current = figure;
  resolveStepGan(what, moves).forEach((cmd) => {
    const parsed = parseGanCommand(cmd);
    if (!parsed || parsed.type !== "mark-right") {
      return;
    }
    const result = applyGan(current, cmd);
    if (!result.error) {
      current = result.figure;
    }
  });
  return current;
}

export function useTriangleLessons(options?: {
  playPointer?: (animation: FigureAnimation, onComplete: () => void) => void;
  cancelPointer?: () => void;
}) {
  const [figure, setFigureState] = useState<Figure>(() => startFigure("scalene"));
  const [coach, setCoachState] = useState<CoachState | null>(null);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [quizFeedback, setQuizFeedback] = useState("");
  const [quizSecondsLeft, setQuizSecondsLeft] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);
  const [animation, setAnimation] = useState<FigureAnimation | null>(null);
  const [userLessons, setUserLessons] = useState<SavedLesson[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [historyLength, setHistoryLength] = useState(0);

  const figureRef = useRef(figure);
  figureRef.current = figure;
  const coachRef = useRef(coach);
  coachRef.current = coach;
  const quizRef = useRef(quiz);
  quizRef.current = quiz;
  const historyRef = useRef<Snapshot[]>([]);
  const historyIndexRef = useRef(-1);
  const lessonNumberRef = useRef<number | null>(null);
  const quizResolverRef = useRef<((result: QuizResult) => void) | null>(null);
  const quizTimerRef = useRef<number | null>(null);
  const quizTickRef = useRef<number | null>(null);
  const animTimerRef = useRef<number | null>(null);
  const animGenRef = useRef(0);
  const playPointerRef = useRef(options?.playPointer);
  playPointerRef.current = options?.playPointer;
  const cancelPointerRef = useRef(options?.cancelPointer);
  cancelPointerRef.current = options?.cancelPointer;

  useEffect(() => {
    setUserLessons(readUserCatalog(TRIANGLE_CATALOG_KEY));
  }, []);

  const publishHistory = useCallback((index: number, length: number) => {
    historyIndexRef.current = index;
    setHistoryIndex(index);
    setHistoryLength(length);
  }, []);

  const applyFigure = useCallback((next: Figure) => {
    figureRef.current = next;
    setFigureState(next);
  }, []);

  const clearQuizTimers = useCallback(() => {
    if (quizTimerRef.current) {
      window.clearTimeout(quizTimerRef.current);
      quizTimerRef.current = null;
    }
    if (quizTickRef.current) {
      window.clearInterval(quizTickRef.current);
      quizTickRef.current = null;
    }
  }, []);

  const expireQuiz = useCallback(() => {
    const current = quizRef.current;
    if (!current || current.answered) {
      return;
    }
    clearQuizTimers();
    const next = { ...current, answered: true, timedOut: true };
    quizRef.current = next;
    setQuiz(next);
    setQuizFeedback(formatFigureQuizTimeoutFeedback(current.correct));
    applyFigure(revealQuizTargets(figureRef.current, current.correct));
    setQuizSecondsLeft(null);
    quizResolverRef.current?.({ correct: false, square: "", timedOut: true });
    quizResolverRef.current = null;
  }, [applyFigure, clearQuizTimers]);

  const armQuiz = useCallback((nextQuiz: QuizState) => {
    clearQuizTimers();
    const liveQuiz = liveQuizFromSlide(nextQuiz);
    if (!liveQuiz) {
      quizRef.current = null;
      setQuiz(null);
      setQuizFeedback("");
      setQuizSecondsLeft(null);
      return;
    }
    quizRef.current = liveQuiz;
    setQuiz(liveQuiz);
    setQuizFeedback("");
    setQuizSecondsLeft(QUIZ_TIMEOUT_SECONDS);
    const deadline = Date.now() + QUIZ_TIMEOUT_MS;
    quizTickRef.current = window.setInterval(() => {
      setQuizSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    }, 250);
    quizTimerRef.current = window.setTimeout(expireQuiz, QUIZ_TIMEOUT_MS);
  }, [clearQuizTimers, expireQuiz]);

  const pushSnapshot = useCallback((quizOverride?: QuizState | null) => {
    const source = quizOverride !== undefined ? quizOverride : quizRef.current;
    const snap: Snapshot = {
      figure: cloneFigure(figureRef.current),
      coach: cloneCoach(coachRef.current),
      quiz: liveQuizFromSlide(source),
    };
    const next = historyRef.current.slice(0, historyIndexRef.current + 1);
    next.push(snap);
    historyRef.current = next;
    publishHistory(next.length - 1, next.length);
  }, [publishHistory]);

  const persistStartingTfn = useCallback((tfn: string) => {
    const lessonNumber = lessonNumberRef.current;
    if (!lessonNumber) {
      return;
    }
    const existing = findUserLessonByNumber(lessonNumber, TRIANGLE_CATALOG_KEY);
    if (!existing) {
      return;
    }
    if (teachingSteps(lessonSteps(existing)).length > 0) {
      return;
    }
    const { savedAt: _savedAt, ...rest } = existing;
    setUserLessons(upsertUserLesson({ ...rest, tfn }, TRIANGLE_CATALOG_KEY));
  }, []);

  const restoreSnapshot = useCallback((snap: Snapshot) => {
    applyFigure(cloneFigure(snap.figure));
    coachRef.current = cloneCoach(snap.coach);
    setCoachState(coachRef.current);
    const lesson = lessonNumberRef.current
      ? findUserLessonByNumber(lessonNumberRef.current, TRIANGLE_CATALOG_KEY)
      : undefined;
    const restoredQuiz = quizForRestoredSlide({
      quiz: snap.quiz,
      phase: snap.coach?.phase,
      step: snap.coach?.step,
      steps: lesson ? lessonSteps(lesson) : undefined,
    });
    if (restoredQuiz) {
      armQuiz(restoredQuiz);
    } else {
      clearQuizTimers();
      quizRef.current = null;
      setQuiz(null);
      setQuizFeedback("");
      setQuizSecondsLeft(null);
    }
  }, [applyFigure, armQuiz, clearQuizTimers]);

  const snapshotsFromLesson = useCallback((item: SavedLesson): Snapshot[] => {
    return projectTriangleLessonSession(item).map((slide) => ({
      figure: applyRightMarks(parseTfn(slide.tfn), slide.coach?.what, slide.coach?.moves),
      coach: cloneCoach(slide.coach),
      quiz: liveQuizFromSlide(slide.quiz),
    }));
  }, []);

  const rebuildKeepingPlayhead = useCallback(
    (saved: SavedLesson) => {
      const keep = Math.max(0, historyIndexRef.current);
      historyRef.current = snapshotsFromLesson(saved);
      publishHistory(
        keptPlayheadIndex(historyRef.current, null, keep),
        historyRef.current.length
      );
    },
    [publishHistory, snapshotsFromLesson]
  );

  const restoreWithAnimation = useCallback((snap: Snapshot, nextIndex: number, length: number) => {
    const token = ++animGenRef.current;
    const finish = () => {
      if (animTimerRef.current) {
        window.clearTimeout(animTimerRef.current);
        animTimerRef.current = null;
      }
      if (animGenRef.current !== token) {
        return;
      }
      restoreSnapshot(snap);
      publishHistory(nextIndex, length);
      setAnimation(null);
      setAnimating(false);
    };
    const animation = figureTransitionAnimation(figureRef.current, snap.figure);
    if (!animation || !playPointerRef.current) {
      finish();
      return;
    }
    setAnimating(true);
    setAnimation(animation);
    let settled = false;
    const done = () => {
      if (settled) {
        return;
      }
      settled = true;
      finish();
    };
    animTimerRef.current = window.setTimeout(done, 4000);
    try {
      playPointerRef.current(animation, done);
    } catch {
      done();
    }
  }, [publishHistory, restoreSnapshot]);

  const restoreCatalogIndex = useCallback(
    (index: number, animated: boolean) => {
      const lessonNumber = lessonNumberRef.current;
      const item = lessonNumber
        ? findUserLessonByNumber(lessonNumber, TRIANGLE_CATALOG_KEY)
        : undefined;
      const snaps = item ? snapshotsFromLesson(item) : historyRef.current;
      if (item) {
        historyRef.current = snaps;
      }
      const snap = snaps[index];
      if (!snap) {
        return;
      }
      if (animated) {
        restoreWithAnimation(snap, index, snaps.length);
        return;
      }
      restoreSnapshot(snap);
      publishHistory(index, snaps.length);
    },
    [publishHistory, restoreSnapshot, restoreWithAnimation, snapshotsFromLesson]
  );

  const answerQuiz = useCallback((id: string) => {
    const current = quizRef.current;
    if (!current || current.answered) {
      return;
    }
    const correct = ganAnswerIsCorrect(current.correct, id);
    clearQuizTimers();
    const next = { ...current, answered: true };
    quizRef.current = next;
    setQuiz(next);
    setQuizSecondsLeft(null);
    if (correct) {
      setQuizFeedback(formatQuizCorrectFeedback());
    } else {
      setQuizFeedback(formatFigureQuizIncorrectFeedback(current.correct));
      applyFigure(revealQuizTargets(figureRef.current, current.correct));
    }
    quizResolverRef.current?.({ correct, square: id });
    quizResolverRef.current = null;
  }, [applyFigure, clearQuizTimers]);

  const askQuiz = useCallback((nextQuiz: QuizState, options?: { signal?: AbortSignal }) => {
    armQuiz(nextQuiz);
    return new Promise<QuizResult>((resolve) => {
      quizResolverRef.current = resolve;
      if (options?.signal) {
        const onAbort = () => {
          expireQuiz();
        };
        if (options.signal.aborted) {
          onAbort();
          return;
        }
        options.signal.addEventListener("abort", onAbort);
      }
    });
  }, [armQuiz, expireQuiz]);

  const resetSession = useCallback((options?: { resetFigure?: boolean }) => {
    clearQuizTimers();
    if (animTimerRef.current) {
      window.clearTimeout(animTimerRef.current);
      animTimerRef.current = null;
    }
    animGenRef.current += 1;
    cancelPointerRef.current?.();
    if (options?.resetFigure !== false) {
      applyFigure(startFigure("scalene"));
    }
    coachRef.current = null;
    setCoachState(null);
    quizRef.current = null;
    setQuiz(null);
    setQuizFeedback("");
    setQuizSecondsLeft(null);
    setAnimating(false);
    setAnimation(null);
    historyRef.current = [];
    publishHistory(-1, 0);
    lessonNumberRef.current = null;
  }, [applyFigure, clearQuizTimers, publishHistory]);

  const wipe = useCallback(() => {
    resetSession({ resetFigure: true });
  }, [resetSession]);

  const createLesson = useCallback((args: { title: string; paragraphs?: string[] }) => {
    resetSession({ resetFigure: false });
    const copy = normalizeCoachCopy({ body: "", paragraphs: args.paragraphs || [] });
    const ensured = ensureGoalTriangles(figureRef.current, {
      title: args.title,
      body: copy.body,
      paragraphs: copy.paragraphs,
    });
    applyFigure(ensured);
    const tfn = serializeTfn(ensured);
    const created = createCatalogLesson(
      { title: args.title, body: copy.body, paragraphs: copy.paragraphs, tfn },
      TRIANGLE_CATALOG_KEY
    );
    lessonNumberRef.current = created.number || null;
    setUserLessons(readUserCatalog(TRIANGLE_CATALOG_KEY));
    const intro: CoachState = {
      title: created.title,
      lessonTitle: created.title,
      body: copy.body,
      paragraphs: copy.paragraphs,
      lesson: created.number,
      phase: "goal",
    };
    coachRef.current = intro;
    setCoachState(intro);
    pushSnapshot();
    return {
      success: true,
      message: `Created triangle lesson ${created.number}: ${created.title}. Student status is on the first panel (Goal). Next: add-lesson-step with lesson: ${created.number} — that stores later beats without moving the slider. Use GAN in why/what (${COACH_GAN_RULE})`,
      lesson: created.number as number,
      title: created.title,
      screen: "goal" as const,
    };
  }, [applyFigure, pushSnapshot, resetSession]);

  const addLessonStep = useCallback(
    async (args: {
      lesson?: number;
      title: string;
      why?: string;
      what?: string;
      type?: string;
      paragraphs?: string[];
      moves?: string[];
      question?: string;
      correct?: string[];
      hint?: string;
      quizType?: QuizState["type"];
      tfn?: string;
      signal?: AbortSignal;
    }) => {
      const type = parseLessonStepType(args.type);
      const isRiddle = type === "riddle";
      const question = (args.question || "").trim();
      const correct = (args.correct || []).map((item) => item.trim()).filter(Boolean);
      const failed = (message: string, lesson = 0) => ({
        success: false,
        message,
        lesson,
        step: 0,
        totalSteps: 0,
        screen: isRiddle ? ("riddle" as const) : ("step" as const),
        nextTools: ["add-lesson-step"],
        recapWritten: false,
        recapExpected: !isRiddle,
      });
      if (isRiddle) {
        if (!question || !correct.length) {
          return failed("A riddle needs question and at least one correct GAN object (∠C, H, AB, G).");
        }
      } else if (!args.title.trim() || !(args.why || "").trim() || !(args.what || "").trim()) {
        return failed("Each step needs title, why, and what (GAN construction).");
      }
      const lessonNumber = args.lesson || lessonNumberRef.current;
      if (!lessonNumber) {
        return failed("Call create-lesson first.");
      }
      const existing = findUserLessonByNumber(lessonNumber, TRIANGLE_CATALOG_KEY);
      if (!existing) {
        return failed(`No lesson ${lessonNumber}.`, lessonNumber);
      }
      lessonNumberRef.current = lessonNumber;
      const fromTfn =
        typeof args.tfn === "string" && args.tfn.trim()
          ? args.tfn.trim()
          : tfnAfterTeaching(existing);
      if (isRiddle) {
        const missing = missingQuizTargets(parseTfn(fromTfn), correct);
        if (missing.length) {
          return failed(
            `${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} not on the figure. Construct and label ${
              missing.length === 1 ? "it" : "them"
            } first (centroid: g(△ABC)) so the student can click ${missing.length === 1 ? "it" : "them"}.`
          );
        }
      }
      const totalTeaching = teachingSteps(lessonSteps(existing)).length + 1;
      const constructions = isRiddle ? [] : resolveStepGan(args.what, args.moves);
      const coach = coachFromDraft(
        {
          title: args.title || (isRiddle ? "Riddle" : "Step"),
          why: args.why || "",
          what: args.what || "",
          type,
          paragraphs: args.paragraphs,
          moves: constructions,
          question,
          correct,
          hint: args.hint,
          quizType: args.quizType,
        },
        {
          lessonTitle: existing.title,
          lesson: lessonNumber,
          step: totalTeaching,
          totalSteps: totalTeaching,
          fromFen: fromTfn,
          moves: constructions,
        }
      );
      const quizState: QuizState | undefined = isRiddle
        ? {
            question,
            type: args.quizType || "click-square",
            correct,
            hint: args.hint,
          }
        : undefined;
      const step: SavedLessonStep = {
        title: coach.title,
        body: coach.body,
        paragraphs: coach.paragraphs,
        what: coach.what,
        why: coach.why,
        kind: isRiddle ? "riddle" : "step",
        moves: constructions,
        tfn: fromTfn,
        quiz: quizState,
      };
      setUserLessons(
        upsertLessonStep({
          lessonNumber,
          lessonTitle: existing.title,
          step,
          storageKey: TRIANGLE_CATALOG_KEY,
        })
      );
      const saved = findUserLessonByNumber(lessonNumber, TRIANGLE_CATALOG_KEY);
      if (saved && lessonNumberRef.current === lessonNumber) {
        rebuildKeepingPlayhead(saved);
      }
      const recapExpected = lessonExpectsRecap(totalTeaching);
      if (isRiddle) {
        return {
          success: true,
          message: `Stored riddle step ${totalTeaching} of triangle lesson ${lessonNumber}. Live playhead unchanged — did not jump to the last step. The student reaches it with Next.`,
          lesson: lessonNumber,
          step: totalTeaching,
          totalSteps: totalTeaching,
          screen: "riddle" as const,
          nextTools: ["how_to_ask_the_user"],
          recapWritten: false,
          recapExpected,
        };
      }
      return {
        success: true,
        message: `Stored teaching step ${totalTeaching} of triangle lesson ${lessonNumber}. Live playhead unchanged — did not jump to the last step. Student taps Play on GAN tokens. Next: add-lesson-step or set-lesson-recap.`,
        lesson: lessonNumber,
        step: totalTeaching,
        totalSteps: totalTeaching,
        screen: "step" as const,
        nextTools: recapExpected
          ? ["add-lesson-step", "set-lesson-recap"]
          : ["add-lesson-step"],
        recapWritten: false,
        recapExpected,
      };
    },
    [rebuildKeepingPlayhead]
  );

  const addLessonSteps = useCallback(
    async (args: {
      lesson?: number;
      steps: { title: string; what: string; why: string; paragraphs?: string[]; moves?: string[] }[];
      summary?: { title?: string; paragraphs: string[] };
    }) => {
      if (!args.steps.length) {
        return {
          success: false,
          message: "Each step needs title, what, and why.",
          lesson: 0,
          step: 0,
          totalSteps: 0,
          screen: "step" as const,
          nextTools: ["add-lesson-step", "set-lesson-recap"],
          recapWritten: false,
          recapExpected: true,
        };
      }
      let last = await addLessonStep({
        lesson: args.lesson,
        title: args.steps[0].title,
        why: args.steps[0].why,
        what: args.steps[0].what,
        paragraphs: args.steps[0].paragraphs,
        moves: args.steps[0].moves,
      });
      for (let i = 1; i < args.steps.length; i++) {
        last = await addLessonStep({
          lesson: args.lesson || last.lesson,
          title: args.steps[i].title,
          why: args.steps[i].why,
          what: args.steps[i].what,
          paragraphs: args.steps[i].paragraphs,
          moves: args.steps[i].moves,
        });
      }
      return last;
    },
    [addLessonStep]
  );

  const applyLessonRecap = useCallback(
    (args: { lesson?: number; title?: string; paragraphs: string[] }) => {
      const lessonNumber = args.lesson || lessonNumberRef.current;
      if (!lessonNumber) {
        return { success: false, message: "Call create-lesson first.", lesson: 0 };
      }
      const catalog = setLessonRecap(
        lessonNumber,
        { title: args.title, paragraphs: args.paragraphs },
        TRIANGLE_CATALOG_KEY
      );
      setUserLessons(catalog);
      const saved = findUserLessonByNumber(lessonNumber, TRIANGLE_CATALOG_KEY);
      if (saved && lessonNumberRef.current === lessonNumber) {
        rebuildKeepingPlayhead(saved);
      }
      return {
        success: true,
        message: `Recap saved for triangle lesson ${lessonNumber}. Live playhead unchanged. Then how_to_ask_the_user.`,
        lesson: lessonNumber,
      };
    },
    [rebuildKeepingPlayhead]
  );

  const playGan = useCallback(async (notation: string) => {
    const before = figureRef.current;
    const result = applyGan(before, notation);
    if (result.error) {
      return { success: false, message: result.error };
    }
    const animation = result.animation || fallbackPointerAnimation(before, result.figure);
    const commitUpFront = Boolean(
      animation && (animation.type === "move" || animation.type === "rotate")
    );
    if (commitUpFront) {
      applyFigure(result.figure);
    }
    setAnimating(true);
    if (animation && playPointerRef.current) {
      setAnimation(animation);
      await new Promise<void>((resolve) => {
        let settled = false;
        const done = () => {
          if (settled) {
            return;
          }
          settled = true;
          if (animTimerRef.current) {
            window.clearTimeout(animTimerRef.current);
            animTimerRef.current = null;
          }
          if (!commitUpFront) {
            applyFigure(result.figure);
          }
          resolve();
        };
        animTimerRef.current = window.setTimeout(done, 4000);
        try {
          playPointerRef.current!(animation, done);
        } catch {
          done();
        }
      });
    } else if (animation) {
      setAnimation(animation);
      await new Promise((resolve) => {
        animTimerRef.current = window.setTimeout(resolve, 2100);
      });
      if (!commitUpFront) {
        applyFigure(result.figure);
      }
    } else if (!commitUpFront) {
      applyFigure(result.figure);
    }
    persistStartingTfn(serializeTfn(result.figure));
    setAnimation(null);
    setAnimating(false);
    return { success: true, message: `Played ${notation}`, created: result.created };
  }, [applyFigure, persistStartingTfn]);

  const playCoachMove = useCallback(async (notation: string) => {
    const coachNow = coachRef.current;
    if (!coachNow || isRecapPhase(coachNow.phase)) {
      return { success: false, message: "No construction to play on this screen." };
    }
    const commands = resolveStepGan(coachNow.what, coachNow.moves);
    const states = coachPlayGan({ figure: figureRef.current, commands });
    const target = states.find((item) => item.notation === notation);
    if (!target || target.status !== "ready") {
      return { success: false, message: "That construction is not ready." };
    }
    return playGan(notation);
  }, [playGan]);

  const setFigureFromArgs = useCallback((args: { tfn?: string; template?: string }) => {
    if (args.template) {
      const templated = figureFromTemplate(args.template);
      if (!templated) {
        return { success: false, message: `Unknown template "${args.template}".`, data: { templates: templateNames() } };
      }
      applyFigure(templated);
      persistStartingTfn(serializeTfn(templated));
      return { success: true, message: `Loaded template ${args.template}`, data: figureSummary(templated) };
    }
    if (args.tfn) {
      const parsed = parseTfn(args.tfn);
      applyFigure(parsed);
      persistStartingTfn(serializeTfn(parsed));
      return { success: true, message: "Loaded TFN", data: figureSummary(parsed) };
    }
    applyFigure(defaultScalene());
    persistStartingTfn(serializeTfn(defaultScalene()));
    return { success: true, message: "Reset to scalene △ABC", data: figureSummary(defaultScalene()) };
  }, [applyFigure, persistStartingTfn]);

  const rotate = useCallback((around: string, deg: number, target?: string) => {
    const names = target && target.indexOf("△") === 0 ? target.replace("△", "").split("") : target ? target.split("") : Object.keys(figureRef.current.points);
    const cmd = `rot(${around},${deg},${target && target.indexOf("△") === 0 ? target : names.join("")})`;
    return playGan(cmd);
  }, [playGan]);

  const mark = useCallback((gan: string) => {
    return playGan(gan);
  }, [playGan]);

  const openSavedLesson = useCallback((id: string) => {
    const item = findUserLesson(id, TRIANGLE_CATALOG_KEY);
    if (!item) {
      return { success: false, message: `No triangle lesson "${id}".`, data: null };
    }
    wipe();
    lessonNumberRef.current = item.number || null;
    historyRef.current = snapshotsFromLesson(item);
    if (historyRef.current[0]) {
      restoreSnapshot(historyRef.current[0]);
      publishHistory(0, historyRef.current.length);
    }
    return {
      success: true,
      message: `Opened ${item.title}`,
      data: { id: item.id, lesson: item.number, steps: historyRef.current.length },
    };
  }, [publishHistory, restoreSnapshot, snapshotsFromLesson, wipe]);

  const stepBack = useCallback(() => {
    if (animating || historyIndexRef.current <= 0) {
      return;
    }
    restoreCatalogIndex(historyIndexRef.current - 1, true);
  }, [animating, restoreCatalogIndex]);

  const stepNext = useCallback(() => {
    if (animating) {
      return;
    }
    if (historyIndexRef.current >= 0 && historyIndexRef.current < historyRef.current.length - 1) {
      restoreCatalogIndex(historyIndexRef.current + 1, true);
    }
  }, [animating, restoreCatalogIndex]);

  const stepFirst = useCallback(() => {
    if (animating || historyIndexRef.current <= 0) {
      return;
    }
    restoreCatalogIndex(0, false);
  }, [animating, restoreCatalogIndex]);

  const stepLast = useCallback(() => {
    if (animating) {
      return;
    }
    const last = historyRef.current.length - 1;
    if (last >= 0 && historyIndexRef.current < last) {
      restoreCatalogIndex(last, false);
    }
  }, [animating, restoreCatalogIndex]);

  const savedLesson =
    typeof coach?.lesson === "number"
      ? userLessons.find((item) => item.number === coach.lesson)
      : undefined;
  const teachingCount = savedLesson
    ? teachingSteps(lessonSteps(savedLesson)).length
    : coach?.totalSteps || 0;
  const expectsRecap = lessonExpectsRecap(teachingCount, savedLesson?.recap);
  const recapOnFile = Boolean(savedLesson?.recap && savedLesson.recap.paragraphs.length);
  const awaitingContinuation = Boolean(
    coach &&
    typeof coach.lesson === "number" &&
    historyIndex >= 0 &&
    historyIndex >= historyLength - 1 &&
    (
      coach.phase === "goal" ||
      (coach.phase === "step" && expectsRecap && !recapOnFile)
    )
  );
  const coachPlayMoves = useMemo(() => {
    if (!coach || isRecapPhase(coach.phase)) {
      return [];
    }
    return coachPlayGan({
      figure,
      commands: resolveStepGan(coach.what, coach.moves),
    });
  }, [coach, figure]);

  const canStepBack = historyIndex > 0;
  const canStepForward = historyIndex >= 0 && historyIndex < historyLength - 1;

  return {
    figure,
    coach,
    quiz,
    quizFeedback,
    quizSecondsLeft,
    animating,
    animation,
    historyIndex,
    historyLength,
    catalogSessionLive: Boolean(lessonNumberRef.current),
    userLessons,
    awaitingContinuation,
    expectsRecap,
    teachingCount,
    canStepBack,
    canStepForward,
    coachPlayMoves,
    knownIds: allObjectIds(figure),
    createLesson,
    addLessonStep,
    addLessonSteps,
    applyLessonRecap,
    setCoach: (next: CoachState) => {
      if (lessonNumberRef.current) {
        return {
          lesson: lessonNumberRef.current,
          step: coachRef.current?.step || 1,
          totalSteps: coachRef.current?.totalSteps || 1,
          skipped: true,
          message: CATALOG_LIVE_FROZEN_MESSAGE,
        };
      }
      coachRef.current = next;
      setCoachState(next);
      applyFigure(applyRightMarks(figureRef.current, next.what, next.moves));
      return {
        lesson: next.lesson || 0,
        step: next.step || 1,
        totalSteps: next.totalSteps || 1,
        skipped: false,
      };
    },
    getFigure: () => figureRef.current,
    applyGan: (gan: string) => playGan(gan),
    setFigure: setFigureFromArgs,
    movePoint: (name: string, position: Vec, opts?: { animate?: boolean }) => {
      if (opts?.animate === false) {
        applyFigure(moveFreePoint(figureRef.current, name, position));
        return Promise.resolve({ success: true, message: `Moved ${name}` });
      }
      return playGan(`move(${name},${position.x},${position.y})`);
    },
    rotateFigure: rotate,
    markFigure: mark,
    measure: (id: string) => measureFigure(figureRef.current, id),
    summary: () => figureSummary(figureRef.current),
    templates: () => templateNames(),
    templateTfn: (id: string) => FIGURE_TEMPLATES[id],
    askQuiz,
    playCoachMove,
    onObjectClick: answerQuiz,
    listLessons: () => ({
      templates: templateNames(),
      saved: userLessons.map((item) => ({
        number: item.number,
        id: item.id,
        title: item.title,
        steps: teachingSteps(lessonSteps(item)).length,
      })),
      notation: COACH_GAN_RULE,
    }),
    openSavedLesson,
    deleteSavedLesson: (id: string) => {
      setUserLessons(removeUserLesson(id, TRIANGLE_CATALOG_KEY));
    },
    clearLesson: () => {
      setCoachState(null);
      coachRef.current = null;
      setQuiz(null);
      setQuizFeedback("");
      applyFigure({ ...figureRef.current, highlights: [], ghost: undefined });
    },
    stepBack,
    stepNext,
    stepFirst,
    stepLast,
    endLesson: wipe,
  };
}
