import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { allObjectIds, cloneFigure, defaultScalene, moveFreePoint } from "../geometry/figure";
import { applyGan } from "../geometry/gan";
import { ganAnswerIsCorrect } from "../geometry/hitTest";
import { figureSummary, measureFigure } from "../geometry/measure";
import { COACH_GAN_RULE } from "../geometry/notation";
import { coachPlayGan, resolveStepGan } from "../geometry/stepPlay";
import { FIGURE_TEMPLATES, figureFromTemplate, startFigure, templateNames } from "../geometry/templates";
import { parseTfn, serializeTfn } from "../geometry/tfn";
import { Figure, FigureAnimation, Vec } from "../geometry/types";
import {
  coachFromDraft,
  coachFromSummary,
  isRecapPhase,
  lessonExpectsRecap,
  parseLessonStepType,
  teachingSteps,
} from "../lessons/lessonCopy";
import { normalizeCoachCopy } from "../lessons/coachParagraphs";
import {
  formatQuizCorrectFeedback,
  formatQuizIncorrectFeedback,
  formatQuizTimeoutFeedback,
  QUIZ_TIMEOUT_MS,
  QUIZ_TIMEOUT_SECONDS,
} from "../lessons/quizCopy";
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
} from "../lessons/userCatalog";

type Snapshot = {
  figure: Figure;
  coach: CoachState | null;
  quiz: QuizState | null;
};

function cloneCoach(coach: CoachState | null): CoachState | null {
  return coach ? { ...coach, paragraphs: coach.paragraphs ? [...coach.paragraphs] : undefined, moves: coach.moves ? [...coach.moves] : undefined } : null;
}

export function useTriangleLessons() {
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
  const [awaitingContinuation, setAwaitingContinuation] = useState(false);

  const figureRef = useRef(figure);
  figureRef.current = figure;
  const coachRef = useRef(coach);
  coachRef.current = coach;
  const historyRef = useRef<Snapshot[]>([]);
  const historyIndexRef = useRef(-1);
  const lessonNumberRef = useRef<number | null>(null);
  const quizResolverRef = useRef<((result: QuizResult) => void) | null>(null);
  const quizTimerRef = useRef<number | null>(null);
  const quizTickRef = useRef<number | null>(null);
  const animTimerRef = useRef<number | null>(null);

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

  const pushSnapshot = useCallback(() => {
    const snap: Snapshot = {
      figure: cloneFigure(figureRef.current),
      coach: cloneCoach(coachRef.current),
      quiz: quiz,
    };
    const next = historyRef.current.slice(0, historyIndexRef.current + 1);
    next.push(snap);
    historyRef.current = next;
    publishHistory(next.length - 1, next.length);
  }, [publishHistory, quiz]);

  const restoreSnapshot = useCallback((snap: Snapshot) => {
    applyFigure(cloneFigure(snap.figure));
    coachRef.current = cloneCoach(snap.coach);
    setCoachState(coachRef.current);
    setQuiz(snap.quiz);
  }, [applyFigure]);

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

  const answerQuiz = useCallback((id: string) => {
    const current = quiz;
    if (!current || current.answered) {
      return;
    }
    const correct = ganAnswerIsCorrect(current.correct, id);
    clearQuizTimers();
    const next = { ...current, answered: true };
    setQuiz(next);
    if (correct) {
      setQuizFeedback(formatQuizCorrectFeedback());
    } else {
      setQuizFeedback(formatQuizIncorrectFeedback(current.correct));
      applyFigure({
        ...figureRef.current,
        highlights: current.correct.slice(),
      });
    }
    quizResolverRef.current?.({ correct, square: id });
    quizResolverRef.current = null;
  }, [applyFigure, clearQuizTimers, quiz]);

  const askQuiz = useCallback((nextQuiz: QuizState, options?: { signal?: AbortSignal }) => {
    setQuiz(nextQuiz);
    setQuizFeedback("");
    setQuizSecondsLeft(QUIZ_TIMEOUT_SECONDS);
    const deadline = Date.now() + QUIZ_TIMEOUT_MS;
    quizTickRef.current = window.setInterval(() => {
      setQuizSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    }, 250);
    return new Promise<QuizResult>((resolve) => {
      quizResolverRef.current = resolve;
      quizTimerRef.current = window.setTimeout(() => {
        setQuiz((current) => current ? { ...current, answered: true, timedOut: true } : current);
        setQuizFeedback(formatQuizTimeoutFeedback(nextQuiz.correct));
        applyFigure({
          ...figureRef.current,
          highlights: nextQuiz.correct.slice(),
        });
        resolve({ correct: false, square: "", timedOut: true });
        quizResolverRef.current = null;
        clearQuizTimers();
      }, QUIZ_TIMEOUT_MS);
      if (options?.signal) {
        const onAbort = () => {
          clearQuizTimers();
          resolve({ correct: false, square: "" });
        };
        if (options.signal.aborted) {
          onAbort();
          return;
        }
        options.signal.addEventListener("abort", onAbort);
      }
    });
  }, [applyFigure, clearQuizTimers]);

  const wipe = useCallback(() => {
    clearQuizTimers();
    applyFigure(startFigure("scalene"));
    coachRef.current = null;
    setCoachState(null);
    setQuiz(null);
    setQuizFeedback("");
    setAnimation(null);
    historyRef.current = [];
    publishHistory(-1, 0);
    lessonNumberRef.current = null;
    setAwaitingContinuation(false);
  }, [applyFigure, clearQuizTimers, publishHistory]);

  const createLesson = useCallback((args: { title: string; paragraphs?: string[] }) => {
    wipe();
    const copy = normalizeCoachCopy({ body: "", paragraphs: args.paragraphs || [] });
    const created = createCatalogLesson(
      { title: args.title, body: copy.body, paragraphs: copy.paragraphs },
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
      message: `Created triangle lesson ${created.number}: ${created.title}. Screen: Goal. Next: add-lesson-step with lesson: ${created.number}. Use GAN in why/what (${COACH_GAN_RULE})`,
      lesson: created.number as number,
      title: created.title,
    };
  }, [pushSnapshot, wipe]);

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
          return failed("A riddle needs question and at least one correct GAN object (∠C, H, AB).");
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
      const totalTeaching = teachingSteps(lessonSteps(existing)).length + 1;
      const constructions = isRiddle ? [] : resolveStepGan(args.what, args.moves);
      const fromTfn = serializeTfn(figureRef.current);
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
      coachRef.current = coach;
      setCoachState(coach);
      setAwaitingContinuation(lessonExpectsRecap(totalTeaching));
      pushSnapshot();
      if (quizState) {
        const quizResult = await askQuiz(quizState, { signal: args.signal });
        return {
          success: quizResult.correct,
          message: `Added riddle step ${totalTeaching} of triangle lesson ${lessonNumber}.`,
          lesson: lessonNumber,
          step: totalTeaching,
          totalSteps: totalTeaching,
          screen: "riddle" as const,
          nextTools: ["how_to_ask_the_user"],
          recapWritten: false,
          recapExpected: lessonExpectsRecap(totalTeaching),
          quiz: quizResult,
        };
      }
      return {
        success: true,
        message: `Added teaching step ${totalTeaching} of triangle lesson ${lessonNumber}. Student taps Play on GAN tokens. Next: add-lesson-step or set-lesson-recap.`,
        lesson: lessonNumber,
        step: totalTeaching,
        totalSteps: totalTeaching,
        screen: "step" as const,
        nextTools: lessonExpectsRecap(totalTeaching)
          ? ["add-lesson-step", "set-lesson-recap"]
          : ["add-lesson-step"],
        recapWritten: false,
        recapExpected: lessonExpectsRecap(totalTeaching),
      };
    },
    [askQuiz, pushSnapshot]
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
      const recapCoach = coachFromSummary(
        { title: args.title, paragraphs: args.paragraphs },
        {
          lessonTitle: findUserLessonByNumber(lessonNumber, TRIANGLE_CATALOG_KEY)?.title || "",
          lesson: lessonNumber,
        }
      );
      coachRef.current = recapCoach;
      setCoachState(recapCoach);
      setAwaitingContinuation(false);
      pushSnapshot();
      return {
        success: true,
        message: `Recap saved for triangle lesson ${lessonNumber}. Then how_to_ask_the_user.`,
        lesson: lessonNumber,
      };
    },
    [pushSnapshot]
  );

  const playGan = useCallback(async (notation: string) => {
    const result = applyGan(figureRef.current, notation);
    if (result.error) {
      return { success: false, message: result.error };
    }
    setAnimating(true);
    if (result.animation) {
      setAnimation(result.animation);
    }
    await new Promise((resolve) => {
      animTimerRef.current = window.setTimeout(resolve, 720);
    });
    applyFigure(result.figure);
    setAnimation(null);
    setAnimating(false);
    return { success: true, message: `Played ${notation}`, created: result.created };
  }, [applyFigure]);

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
      return { success: true, message: `Loaded template ${args.template}`, data: figureSummary(templated) };
    }
    if (args.tfn) {
      const parsed = parseTfn(args.tfn);
      applyFigure(parsed);
      return { success: true, message: "Loaded TFN", data: figureSummary(parsed) };
    }
    applyFigure(defaultScalene());
    return { success: true, message: "Reset to scalene △ABC", data: figureSummary(defaultScalene()) };
  }, [applyFigure]);

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
    const steps = lessonSteps(item);
    const firstTfn = (steps[0] && steps[0].tfn) || item.tfn;
    if (firstTfn) {
      applyFigure(parseTfn(firstTfn));
    }
    const intro: CoachState = {
      title: item.title,
      lessonTitle: item.title,
      body: item.body,
      paragraphs: item.paragraphs,
      lesson: item.number,
      phase: "goal",
    };
    if (steps[0]) {
      const step = steps[0];
      coachRef.current = {
        title: step.title,
        lessonTitle: item.title,
        body: step.body,
        paragraphs: step.paragraphs,
        what: step.what,
        why: step.why,
        lesson: item.number,
        step: 1,
        totalSteps: teachingSteps(steps).length,
        phase: step.kind === "riddle" ? "riddle" : "step",
        moves: step.moves,
        fromFen: step.tfn,
      };
    } else {
      coachRef.current = intro;
    }
    setCoachState(coachRef.current);
    pushSnapshot();
    return { success: true, message: `Opened ${item.title}`, data: { id: item.id, lesson: item.number } };
  }, [applyFigure, pushSnapshot, wipe]);

  const stepBack = useCallback(() => {
    if (animating || historyIndexRef.current <= 0) {
      return;
    }
    const nextIndex = historyIndexRef.current - 1;
    restoreSnapshot(historyRef.current[nextIndex]);
    publishHistory(nextIndex, historyRef.current.length);
  }, [animating, publishHistory, restoreSnapshot]);

  const stepNext = useCallback(() => {
    if (animating) {
      return;
    }
    if (historyIndexRef.current >= 0 && historyIndexRef.current < historyRef.current.length - 1) {
      const nextIndex = historyIndexRef.current + 1;
      restoreSnapshot(historyRef.current[nextIndex]);
      publishHistory(nextIndex, historyRef.current.length);
    }
  }, [animating, publishHistory, restoreSnapshot]);

  const stepFirst = useCallback(() => {
    if (animating || historyIndexRef.current <= 0) {
      return;
    }
    restoreSnapshot(historyRef.current[0]);
    publishHistory(0, historyRef.current.length);
  }, [animating, publishHistory, restoreSnapshot]);

  const stepLast = useCallback(() => {
    if (animating) {
      return;
    }
    const last = historyRef.current.length - 1;
    if (last < 0 || historyIndexRef.current >= last) {
      return;
    }
    restoreSnapshot(historyRef.current[last]);
    publishHistory(last, historyRef.current.length);
  }, [animating, publishHistory, restoreSnapshot]);

  const savedLesson =
    typeof coach?.lesson === "number"
      ? userLessons.find((item) => item.number === coach.lesson)
      : undefined;
  const teachingCount = savedLesson
    ? teachingSteps(lessonSteps(savedLesson)).length
    : coach?.totalSteps || 0;
  const expectsRecap = lessonExpectsRecap(teachingCount, savedLesson?.recap);
  const coachPlayMoves = useMemo(() => {
    if (!coach || isRecapPhase(coach.phase)) {
      return [];
    }
    return coachPlayGan({
      figure,
      commands: resolveStepGan(coach.what, coach.moves),
    });
  }, [coach, figure]);

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
    userLessons,
    awaitingContinuation,
    expectsRecap,
    coachPlayMoves,
    knownIds: allObjectIds(figure),
    createLesson,
    addLessonStep,
    addLessonSteps,
    applyLessonRecap,
    setCoach: (next: CoachState) => {
      coachRef.current = next;
      setCoachState(next);
      return {
        lesson: next.lesson || lessonNumberRef.current || 0,
        step: next.step || 1,
        totalSteps: next.totalSteps || 1,
      };
    },
    getFigure: () => figureRef.current,
    applyGan: (gan: string) => playGan(gan),
    setFigure: setFigureFromArgs,
    movePoint: (name: string, position: Vec) => {
      applyFigure(moveFreePoint(figureRef.current, name, position));
      return { success: true, message: `Moved ${name}` };
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
