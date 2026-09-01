import { Dispatch, MutableRefObject, SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { Board } from "../models/Board";
import { Position } from "../models/Position";
import { TeamType } from "../Types";
import {
  FAMOUS_GAMES,
  getFamousGame,
  getPieceLesson,
  PIECE_LESSONS,
} from "../lessons/catalog";
import { COACH_NOTATION_RULE, coachNotationViolation } from "../lessons/coachNotation";
import { normalizeCoachCopy } from "../lessons/coachParagraphs";
import {
  BoardArrow,
  BoardHighlight,
  CoachState,
  LoadedLine,
  QuizResult,
  QuizState,
  SavedLesson,
  WaitForUserResult,
  WaitForUserState,
} from "../lessons/types";
import { createCatalogLesson, customLessonId, findUserLesson, findUserLessonByNumber, lessonSteps, readUserCatalog, removeUserLesson, setLessonRecap, upsertLessonStep, upsertUserLesson } from "../lessons/userCatalog";
import {
  boardFromFen,
  boardFromPlacements,
  boardToFen,
  createPiece,
  parsePieceType,
  parseTeam,
  PlacedPiece,
  startingLearnBoard,
  startingPlayBoard,
} from "../utils/board-setup";
import {
  chessNotationToCoordinates,
  coordinatesToNotation,
  parseMoveOrCastle,
} from "../utils/chess-notation-utils";
import { logLessonDebug } from "../lessons/debugLog";
import { fenAfterTeaching, lastTeachingSlideIndex, projectLessonSession } from "../lessons/lessonDocument";
import { fenForDebug, overlaySnapshot } from "../lessons/debugSnapshot";
import {
  formatQuizCorrectFeedback,
  formatQuizIncorrectFeedback,
  formatQuizTimeoutFeedback,
  isBoardSquare,
  quizAnswerIsCorrect,
  QUIZ_TIMEOUT_MS,
  QUIZ_TIMEOUT_SECONDS,
} from "../lessons/quizCopy";
import { continueWaitChoice, WAIT_TIMEOUT_MS } from "../lessons/waitForUser";
import {
  coachFromDraft,
  coachFromShowme,
  isRecapPhase,
  isShowmeLesson,
  isShowmePhase,
  lessonExpectsRecap,
  LessonStepDraft,
  LessonSummaryDraft,
  parseLessonFormat,
  parseLessonStepType,
  teachingSteps,
} from "../lessons/lessonCopy";
import {
  applyMovesToBoard,
  coachPlayMoves,
  resolveStepMoves,
} from "../lessons/stepPlay";
import { resolveShowMeLesson, ShowMePlayback } from "../lessons/showMe";
import {
  canRedoExperiment,
  canUndoExperiment,
  emptyExperimentCursor,
  truncateItems,
} from "../lessons/experimentHistory";

type LessonSnapshot = {
  board: Board;
  highlights: BoardHighlight[];
  arrows: BoardArrow[];
  coach: CoachState | null;
  quiz: QuizState | null;
  ply: number;
};

type ParkedLearnSession = {
  history: LessonSnapshot[];
  historyIndex: number;
  loadedLine: LoadedLine | null;
  lessonNumber: number | null;
};

type Args = {
  boardRef: MutableRefObject<Board>;
  setBoard: Dispatch<SetStateAction<Board>>;
  playMoveSync: (from: Position, to: Position) => boolean;
  animateMove: (
    from: Position,
    to: Position,
    team: "w" | "b",
    onComplete?: () => void
  ) => void;
  cancelMoveAnimation?: () => void;
  hideCheckmate: () => void;
};

/** Survives host CDP timeouts that remount the React tree. */
let persistedWait: WaitForUserState | null = null;
let persistedQuiz: QuizState | null = null;
let persistedQuizFeedback = "";
let persistedQuizDeadline: number | null = null;
let persistedDraftLesson: number | null = null;

export function useChessLessons({
  boardRef,
  setBoard,
  playMoveSync,
  animateMove,
  cancelMoveAnimation,
  hideCheckmate,
}: Args) {
  const [learnMode, setLearnMode] = useState(true);
  const [coach, setCoachState] = useState<CoachState | null>(null);
  const [highlights, setHighlights] = useState<BoardHighlight[]>([]);
  const [arrows, setArrows] = useState<BoardArrow[]>([]);
  const [quiz, setQuizState] = useState<QuizState | null>(() => persistedQuiz);
  const [quizFeedback, setQuizFeedbackState] = useState(() => persistedQuizFeedback);
  const [quizSecondsLeft, setQuizSecondsLeft] = useState<number | null>(() => {
    if (!persistedQuiz || persistedQuiz.answered || persistedQuizDeadline === null) {
      return null;
    }
    return Math.max(0, Math.ceil((persistedQuizDeadline - Date.now()) / 1000));
  });
  const [wait, setWaitState] = useState<WaitForUserState | null>(() => persistedWait);
  const [animating, setAnimating] = useState(false);

  const learnModeRef = useRef(true);
  const parkedRef = useRef<ParkedLearnSession | null>(null);
  const loadedLineRef = useRef<LoadedLine | null>(null);
  const quizResolverRef = useRef<((result: QuizResult) => void) | null>(null);
  const quizTimerRef = useRef<number | null>(null);
  const quizTickRef = useRef<number | null>(null);
  const quizAbortCleanupRef = useRef<(() => void) | null>(null);
  const quizRef = useRef<QuizState | null>(persistedQuiz);
  const waitResolverRef = useRef<((result: WaitForUserResult) => void) | null>(null);
  const waitTimerRef = useRef<number | null>(null);
  const waitAbortCleanupRef = useRef<(() => void) | null>(null);
  const waitRef = useRef<WaitForUserState | null>(persistedWait);
  const lastQuizRef = useRef<QuizState | null>(persistedQuiz);
  const playChainRef = useRef<Promise<unknown>>(Promise.resolve());
  const showmeGenRef = useRef(0);
  const showmePlaybackRef = useRef<ShowMePlayback>("idle");
  const showmePlyRef = useRef(0);
  const showmePauseWaitRef = useRef<(() => void) | null>(null);
  const showmeRunRef = useRef<Promise<unknown>>(Promise.resolve());
  const playShowMeLineRef = useRef<(options?: { fromStart?: boolean }) => Promise<{
    success: boolean;
    message: string;
    data: unknown;
  }>>();
  const animTokenRef = useRef(0);
  const [showmePlayback, setShowmePlayback] = useState<ShowMePlayback>("idle");
  const [showmePly, setShowmePly] = useState(0);
  const highlightsRef = useRef<BoardHighlight[]>([]);
  const arrowsRef = useRef<BoardArrow[]>([]);
  const coachRef = useRef<CoachState | null>(null);
  const historyRef = useRef<LessonSnapshot[]>([]);
  const historyIndexRef = useRef(-1);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [historyLength, setHistoryLength] = useState(0);
  const experimentRef = useRef<LessonSnapshot[]>([]);
  const experimentIndexRef = useRef(-1);
  const [experimentCursor, setExperimentCursor] = useState(emptyExperimentCursor);
  const [userLessons, setUserLessons] = useState<SavedLesson[]>([]);
  const restoringRef = useRef(false);
  const activeLessonNumberRef = useRef<number | null>(null);
  const draftLessonNumberRef = useRef<number | null>(persistedDraftLesson);

  const rememberDraftLesson = useCallback((lessonNumber: number | null) => {
    draftLessonNumberRef.current = lessonNumber;
    persistedDraftLesson = lessonNumber;
  }, []);

  useEffect(() => {
    setUserLessons(readUserCatalog());
  }, []);

  const setQuiz = useCallback((next: QuizState | null) => {
    persistedQuiz = next
      ? {
          ...next,
          correct: [...next.correct],
        }
      : null;
    if (!next) {
      persistedQuizDeadline = null;
      persistedQuizFeedback = "";
    }
    quizRef.current = next;
    setQuizState(next);
  }, []);

  const setQuizFeedback = useCallback((text: string) => {
    persistedQuizFeedback = text;
    setQuizFeedbackState(text);
  }, []);

  const persistLesson = useCallback((lesson: Omit<SavedLesson, "savedAt">) => {
    if (restoringRef.current) {
      return;
    }
    setUserLessons(upsertUserLesson(lesson));
  }, []);

  const resolveLessonNumber = useCallback((requested?: number) => {
    if (typeof requested === "number" && requested > 0) {
      return requested;
    }
    if (activeLessonNumberRef.current) {
      return activeLessonNumberRef.current;
    }
    return 0;
  }, []);

  const applyBoard = useCallback(
    (board: Board) => {
      board.learnMode = true;
      board.winningTeam = undefined;
      board.calculateAllMoves();
      boardRef.current = board;
      setBoard(board);
    },
    [boardRef, setBoard]
  );

  const clearAnnotations = useCallback(() => {
    highlightsRef.current = [];
    arrowsRef.current = [];
    setHighlights([]);
    setArrows([]);
    logLessonDebug("visual", "clear-annotations", {});
  }, []);

  const clearWaitWatchers = useCallback(() => {
    if (waitTimerRef.current !== null) {
      window.clearTimeout(waitTimerRef.current);
      waitTimerRef.current = null;
    }
    if (waitAbortCleanupRef.current) {
      waitAbortCleanupRef.current();
      waitAbortCleanupRef.current = null;
    }
  }, []);

  const clearQuizWatchers = useCallback(() => {
    if (quizTimerRef.current !== null) {
      window.clearTimeout(quizTimerRef.current);
      quizTimerRef.current = null;
    }
    if (quizTickRef.current !== null) {
      window.clearInterval(quizTickRef.current);
      quizTickRef.current = null;
    }
    if (quizAbortCleanupRef.current) {
      quizAbortCleanupRef.current();
      quizAbortCleanupRef.current = null;
    }
  }, []);

  const setWait = useCallback((next: WaitForUserState | null) => {
    persistedWait = next;
    waitRef.current = next;
    setWaitState(next);
    if (next) {
      learnModeRef.current = true;
      setLearnMode(true);
    }
  }, []);

  const resolveWait = useCallback((result: WaitForUserResult) => {
    clearWaitWatchers();
    const resolver = waitResolverRef.current;
    waitResolverRef.current = null;
    if (result.source !== "timeout") {
      setWait(null);
    }
    if (resolver) {
      resolver(result);
    }
  }, [clearWaitWatchers, setWait]);

  const expireWait = useCallback(() => {
    logLessonDebug("visual", "wait-timeout", {});
    clearWaitWatchers();
    const resolver = waitResolverRef.current;
    waitResolverRef.current = null;
    if (persistedWait) {
      setWait({ ...persistedWait, timedOut: true });
    }
    if (resolver) {
      resolver({ action: "", source: "timeout" });
    }
  }, [clearWaitWatchers, setWait]);

  const expireQuiz = useCallback(() => {
    const current = quizRef.current;
    if (!current || current.answered) {
      return;
    }
    logLessonDebug("visual", "quiz-timeout", {});
    clearQuizWatchers();
    const next = { ...current, timedOut: true, answered: true };
    quizRef.current = next;
    lastQuizRef.current = next;
    setQuiz(next);
    setQuizFeedback(formatQuizTimeoutFeedback(current.correct));
    setQuizSecondsLeft(null);
    highlightsRef.current = current.correct.map((square) => ({
      square: square.toLowerCase(),
      kind: "correct" as const,
    }));
    setHighlights(highlightsRef.current);
    const resolver = quizResolverRef.current;
    quizResolverRef.current = null;
    if (resolver) {
      resolver({ correct: false, square: "", timedOut: true });
    }
  }, [clearQuizWatchers]);

  const cancelQuiz = useCallback((options?: { keepAnswered?: boolean }) => {
    clearQuizWatchers();
    const keep = Boolean(options?.keepAnswered && quizRef.current?.answered);
    if (quizResolverRef.current && !keep) {
      quizResolverRef.current({ correct: false, square: "" });
      quizResolverRef.current = null;
    }
    if (!keep) {
      setQuiz(null);
      setQuizFeedback("");
    }
    setQuizSecondsLeft(null);
    resolveWait({ action: "", source: "cancelled" });
  }, [clearQuizWatchers, resolveWait, setQuiz, setQuizFeedback]);

  const answerQuiz = useCallback((square: string, from?: string) => {
    const current = quizRef.current;
    if (!current || current.answered) {
      return;
    }
    const normalized = square.toLowerCase();
    if (!isBoardSquare(normalized)) {
      return;
    }
    const correct = quizAnswerIsCorrect(current.correct, normalized, from);
    logLessonDebug("user-move", "quiz-click", {
      square: normalized,
      from: from || "",
      correct,
      expected: current.correct,
      question: current.question,
    });
    const resolver = quizResolverRef.current;
    quizResolverRef.current = null;
    clearQuizWatchers();
    persistedQuizDeadline = null;
    const next = { ...current, answered: true };
    lastQuizRef.current = next;
    setQuiz(next);
    setQuizSecondsLeft(null);
    if (correct) {
      setQuizFeedback(formatQuizCorrectFeedback());
      const kept = highlightsRef.current.filter(
        (mark) => mark.kind !== "wrong" && mark.kind !== "correct"
      );
      highlightsRef.current = kept;
      setHighlights(kept);
    } else {
      setQuizFeedback(formatQuizIncorrectFeedback(current.correct));
      const correctList = current.correct
        .map((item) => item.toLowerCase())
        .filter(isBoardSquare);
      const marks: BoardHighlight[] = [
        { square: normalized, kind: "wrong" },
        ...correctList
          .filter((item) => item !== normalized)
          .map((item) => ({ square: item, kind: "correct" as const })),
      ];
      highlightsRef.current = marks;
      setHighlights(marks);
    }
    if (resolver) {
      resolver({ correct, square: normalized });
    }
  }, [clearQuizWatchers, setQuiz, setQuizFeedback]);

  useEffect(() => {
    if (!persistedQuiz || persistedQuiz.answered || persistedQuizDeadline === null) {
      return;
    }
    const deadline = persistedQuizDeadline;
    if (deadline <= Date.now()) {
      expireQuiz();
      return;
    }
    quizTimerRef.current = window.setTimeout(expireQuiz, deadline - Date.now());
    quizTickRef.current = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setQuizSecondsLeft(left);
      if (left <= 0) {
        expireQuiz();
      }
    }, 250);
    return () => {
      clearQuizWatchers();
    };
    // Reattach the live quiz timer after a host remount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const publishHistory = useCallback((index: number, length: number) => {
    historyIndexRef.current = index;
    setHistoryIndex(index);
    setHistoryLength(length);
  }, []);

  const publishExperiment = useCallback((index: number, length: number) => {
    experimentIndexRef.current = index;
    setExperimentCursor({ index, length });
  }, []);

  const cloneCoach = (value: CoachState | null): CoachState | null => {
    return value ? { ...value } : null;
  };

  const takeSnapshot = useCallback((): LessonSnapshot => {
    return {
      board: boardRef.current.clone(),
      highlights: highlightsRef.current.map((item) => ({ ...item })),
      arrows: arrowsRef.current.map((item) => ({ ...item })),
      coach: cloneCoach(coachRef.current),
      quiz: lastQuizRef.current
        ? {
            ...lastQuizRef.current,
            correct: [...lastQuizRef.current.correct],
          }
        : null,
      ply: loadedLineRef.current ? loadedLineRef.current.ply : Math.max(0, historyIndexRef.current),
    };
  }, [boardRef]);

  const seedExperimentBaseline = useCallback(
    (snap?: LessonSnapshot) => {
      const baseline = snap || takeSnapshot();
      experimentRef.current = [baseline];
      publishExperiment(0, 1);
    },
    [publishExperiment, takeSnapshot]
  );

  const applyOverlays = useCallback(
    (
      nextHighlights: BoardHighlight[],
      nextArrows: BoardArrow[],
      nextCoach: CoachState | null
    ) => {
      highlightsRef.current = nextHighlights;
      arrowsRef.current = nextArrows;
      coachRef.current = nextCoach;
      setHighlights(nextHighlights);
      setArrows(nextArrows);
      setCoachState(nextCoach);
      logLessonDebug("visual", "apply-overlays", overlaySnapshot({
        highlights: nextHighlights,
        arrows: nextArrows,
        coachTitle: nextCoach ? nextCoach.title : null,
      }));
    },
    []
  );

  const restoreSnapshot = useCallback(
    (snap: LessonSnapshot, options?: { keepExperiment?: boolean }) => {
      logLessonDebug("visual", "restore-snapshot", {
        ply: snap.ply,
        fen: fenForDebug(snap.board),
        ...overlaySnapshot({
          highlights: snap.highlights,
          arrows: snap.arrows,
          coachTitle: snap.coach ? snap.coach.title : null,
        }),
      });
      applyBoard(snap.board.clone());
      applyOverlays(
        snap.highlights.map((item) => ({ ...item })),
        snap.arrows.map((item) => ({ ...item })),
        cloneCoach(snap.coach)
      );
      cancelQuiz();
      if (snap.quiz) {
        const liveQuiz = {
          ...snap.quiz,
          correct: [...snap.quiz.correct],
        };
        lastQuizRef.current = liveQuiz;
        setQuiz(liveQuiz);
        setQuizFeedback("");
      }
      if (loadedLineRef.current) {
        loadedLineRef.current.ply = snap.ply;
      }
      if (!options?.keepExperiment) {
        seedExperimentBaseline(snap);
      }
    },
    [applyBoard, applyOverlays, cancelQuiz, seedExperimentBaseline, setQuiz, setQuizFeedback]
  );

  const resetHistory = useCallback(() => {
    historyRef.current = [];
    publishHistory(-1, 0);
    experimentRef.current = [];
    publishExperiment(-1, 0);
  }, [publishExperiment, publishHistory]);

  const pushSnapshot = useCallback(() => {
    const snap = takeSnapshot();
    const next = historyRef.current.slice(0, historyIndexRef.current + 1);
    next.push(snap);
    historyRef.current = next;
    publishHistory(next.length - 1, next.length);
    seedExperimentBaseline(snap);
  }, [publishHistory, seedExperimentBaseline, takeSnapshot]);

  const updateCurrentSnapshot = useCallback(() => {
    const snap = takeSnapshot();
    if (historyRef.current.length === 0 || historyIndexRef.current < 0) {
      historyRef.current = [snap];
      publishHistory(0, 1);
      seedExperimentBaseline(snap);
      return;
    }
    historyRef.current[historyIndexRef.current] = snap;
    seedExperimentBaseline(snap);
  }, [publishHistory, seedExperimentBaseline, takeSnapshot]);

  const ensureStartingSnapshot = useCallback(() => {
    if (historyRef.current.length === 0) {
      pushSnapshot();
    }
  }, [pushSnapshot]);

  const discardParkedLesson = useCallback(() => {
    parkedRef.current = null;
  }, []);

  const enterLearnMode = useCallback(() => {
    hideCheckmate();
    if (learnModeRef.current) {
      ensureStartingSnapshot();
      return;
    }
    const parked = parkedRef.current;
    if (parked && parked.history.length > 0) {
      const index = Math.max(0, Math.min(parked.historyIndex, parked.history.length - 1));
      const snap = parked.history[index];
      logLessonDebug("visual", "enter-learn-mode", {
        resumed: true,
        fen: fenForDebug(snap.board),
      });
      parkedRef.current = null;
      loadedLineRef.current = parked.loadedLine;
      activeLessonNumberRef.current = parked.lessonNumber;
      historyRef.current = parked.history;
      publishHistory(index, parked.history.length);
      restoreSnapshot(snap);
      learnModeRef.current = true;
      setLearnMode(true);
      return;
    }
    logLessonDebug("visual", "enter-learn-mode", { fen: fenForDebug(boardRef.current) });
    learnModeRef.current = true;
    setLearnMode(true);
    activeLessonNumberRef.current = null;
    cancelQuiz();
    const next = boardRef.current.clone();
    applyBoard(next);
    ensureStartingSnapshot();
  }, [applyBoard, boardRef, cancelQuiz, ensureStartingSnapshot, hideCheckmate, publishHistory, restoreSnapshot]);

  const exitLearnMode = useCallback(() => {
    if (!learnModeRef.current) {
      return;
    }
    logLessonDebug("visual", "exit-learn-mode", {});
    updateCurrentSnapshot();
    parkedRef.current = {
      history: historyRef.current,
      historyIndex: historyIndexRef.current,
      loadedLine: loadedLineRef.current,
      lessonNumber: activeLessonNumberRef.current,
    };
    clearQuizWatchers();
    if (quizResolverRef.current) {
      quizResolverRef.current({ correct: false, square: "" });
      quizResolverRef.current = null;
    }
    resolveWait({ action: "", source: "cancelled" });
    loadedLineRef.current = null;
    resetHistory();
    highlightsRef.current = [];
    arrowsRef.current = [];
    lastQuizRef.current = null;
    coachRef.current = null;
    learnModeRef.current = false;
    setLearnMode(false);
    setCoachState(null);
    setHighlights([]);
    setArrows([]);
    setQuiz(null);
    setQuizFeedback("");
    setQuizSecondsLeft(null);
    setWait(null);
    const reset = startingPlayBoard();
    boardRef.current = reset;
    setBoard(reset);
  }, [boardRef, clearQuizWatchers, resetHistory, resolveWait, setBoard, updateCurrentSnapshot]);

  const wipeLearnSession = useCallback(
    (options?: { resetBoard?: boolean }) => {
      hideCheckmate();
      discardParkedLesson();
      loadedLineRef.current = null;
      activeLessonNumberRef.current = null;
      lastQuizRef.current = null;
      coachRef.current = null;
      showmeGenRef.current += 1;
      animTokenRef.current += 1;
      const resumeShowMe = showmePauseWaitRef.current;
      showmePauseWaitRef.current = null;
      resumeShowMe?.();
      showmePlaybackRef.current = "idle";
      setShowmePlayback("idle");
      showmePlyRef.current = 0;
      setShowmePly(0);
      cancelMoveAnimation?.();
      setAnimating(false);
      cancelQuiz();
      setWait(null);
      clearAnnotations();
      setCoachState(null);
      resetHistory();
      learnModeRef.current = true;
      setLearnMode(true);
      if (options?.resetBoard !== false) {
        applyBoard(startingLearnBoard());
      }
    },
    [applyBoard, cancelMoveAnimation, cancelQuiz, clearAnnotations, discardParkedLesson, hideCheckmate, resetHistory, setWait]
  );

  const setCoach = useCallback((next: CoachState) => {
    const copy = normalizeCoachCopy(next);
    const lessonNumber = resolveLessonNumber(next.lesson);
    const existing = lessonNumber ? findUserLessonByNumber(lessonNumber) : undefined;
    const lessonTitle = next.lessonTitle || existing?.title || next.title;
    const existingCount = existing ? teachingSteps(lessonSteps(existing)).length : 0;
    const requestedStep =
      typeof next.step === "number" && next.step > 0 ? next.step : undefined;
    const stepNumber = requestedStep || existingCount || 1;
    const totalSteps =
      typeof next.totalSteps === "number" && next.totalSteps > 0
        ? next.totalSteps
        : existingCount || stepNumber;
    const resolved: CoachState = {
      ...next,
      body: copy.body,
      paragraphs: copy.paragraphs,
      lessonTitle,
      lesson: lessonNumber || undefined,
      step: stepNumber,
      totalSteps,
      what: next.what,
      why: next.why,
      phase: next.phase || "step",
    };
    logLessonDebug("visual", "set-coach", {
      title: resolved.title,
      body: resolved.body,
      lesson: resolved.lesson,
      step: resolved.step,
      totalSteps: resolved.totalSteps,
    });
    enterLearnMode();
    coachRef.current = resolved;
    setCoachState(resolved);
    updateCurrentSnapshot();
    return {
      lesson: lessonNumber,
      step: stepNumber,
      totalSteps,
    };
  }, [enterLearnMode, resolveLessonNumber, updateCurrentSnapshot]);

  const annotateBoard = useCallback(
    (nextHighlights?: BoardHighlight[], nextArrows?: BoardArrow[]) => {
      const resolvedHighlights =
        nextHighlights !== undefined
          ? nextHighlights
          : highlightsRef.current.map((item) => ({ ...item }));
      const resolvedArrows =
        nextArrows !== undefined
          ? nextArrows
          : arrowsRef.current.map((item) => ({ ...item }));
      logLessonDebug("visual", "annotate-board", overlaySnapshot({
        highlights: resolvedHighlights,
        arrows: resolvedArrows,
        coachTitle: coachRef.current ? coachRef.current.title : null,
      }));
      enterLearnMode();
      highlightsRef.current = resolvedHighlights;
      arrowsRef.current = resolvedArrows;
      setHighlights(resolvedHighlights);
      setArrows(resolvedArrows);
      updateCurrentSnapshot();
    },
    [enterLearnMode, updateCurrentSnapshot]
  );

  const clearLesson = useCallback(() => {
    logLessonDebug("visual", "clear-lesson", {});
    coachRef.current = null;
    highlightsRef.current = [];
    arrowsRef.current = [];
    lastQuizRef.current = null;
    setCoachState(null);
    setHighlights([]);
    setArrows([]);
    setQuiz(null);
    setQuizFeedback("");
    setQuizSecondsLeft(null);
    clearQuizWatchers();
    if (quizResolverRef.current) {
      quizResolverRef.current({ correct: false, square: "" });
      quizResolverRef.current = null;
    }
    resolveWait({ action: "", source: "cancelled" });
    updateCurrentSnapshot();
  }, [clearQuizWatchers, resolveWait, updateCurrentSnapshot]);

  const setPosition = useCallback(
    (args: { fen?: string; pieces?: PlacedPiece[]; turn?: string }) => {
      hideCheckmate();
      discardParkedLesson();
      learnModeRef.current = true;
      setLearnMode(true);
      cancelQuiz();
      clearAnnotations();
      try {
        let next: Board;
        if (args.fen) {
          next = boardFromFen(args.fen, true);
        } else if (args.pieces && args.pieces.length > 0) {
          const turn = args.turn ? parseTeam(args.turn) : TeamType.OUR;
          next = boardFromPlacements(args.pieces, turn, true);
        } else {
          next = startingLearnBoard();
        }
        applyBoard(next);
        logLessonDebug("visual", "set-position", {
          fen: args.fen || fenForDebug(next),
          turn: args.turn || null,
          pieceArgCount: args.pieces ? args.pieces.length : 0,
        });
        pushSnapshot();
        return { success: true, message: "Position set" };
      } catch (error) {
        return { success: false, message: `${error}` };
      }
    },
        [applyBoard, cancelQuiz, clearAnnotations, discardParkedLesson, hideCheckmate, pushSnapshot]
  );

  const noteForPly = (line: LoadedLine, ply: number): string | undefined => {
    const note = line.notes.find((item) => item.ply === ply);
    return note ? note.text : undefined;
  };

  const rebuildToPly = useCallback((line: LoadedLine, ply: number): boolean => {
    const target = Math.max(0, Math.min(ply, line.moves.length));
    const existing = historyRef.current.findIndex((snap) => snap.ply === target);
    if (existing >= 0) {
      restoreSnapshot(historyRef.current[existing]);
      publishHistory(existing, historyRef.current.length);
      return true;
    }
    const next = startingLearnBoard();
    for (let i = 0; i < target; i++) {
      const parsed = parseMoveOrCastle(line.moves[i], next.currentTeam);
      const fromCoords = chessNotationToCoordinates(parsed.from);
      const toCoords = chessNotationToCoordinates(parsed.to);
      const from = new Position(fromCoords.x, fromCoords.y);
      const to = new Position(toCoords.x, toCoords.y);
      const ok = next.tryPlayMove(from, to, { ignoreTurn: true });
      if (!ok) {
        const forced = next.tryPlayMove(from, to, {
          ignoreTurn: true,
          ignoreLegality: true,
        });
        if (!forced) {
          return false;
        }
      }
    }
    line.ply = target;
    applyBoard(next);
    cancelQuiz();
    clearAnnotations();
    if (activeLessonNumberRef.current && coachRef.current) {
      pushSnapshot();
      return true;
    }
    const note = noteForPly(line, target);
    const nextCoach: CoachState = {
      title: line.name,
      body: note || (target === 0 ? "Starting position." : `After move ${target}.`),
      step: target,
      totalSteps: line.moves.length,
    };
    coachRef.current = nextCoach;
    setCoachState(nextCoach);
    pushSnapshot();
    return true;
  }, [applyBoard, cancelQuiz, clearAnnotations, publishHistory, pushSnapshot, restoreSnapshot]);

  const applyFamousGame = useCallback(
    (game: { id: string; name: string; hook: string; moves: string[]; notes?: { ply: number; text: string }[] }) => {
      wipeLearnSession();
      const line: LoadedLine = {
        id: game.id,
        name: game.name,
        moves: game.moves,
        notes: game.notes || [],
        ply: 0,
      };
      loadedLineRef.current = line;
      applyOverlays([], [], {
        title: game.name,
        body: game.hook,
        step: 0,
        totalSteps: game.moves.length,
      });
      pushSnapshot();
      persistLesson({
        id: `game:${game.id}`,
        kind: "game",
        title: game.name,
        body: game.hook,
        gameId: game.id,
        moves: game.moves,
        notes: game.notes || [],
      });
      return {
        success: true,
        message: `Loaded ${game.name}. Use play-line or goto-move.`,
        data: { id: game.id, name: game.name, moves: game.moves.length },
      };
    },
    [applyOverlays, persistLesson, pushSnapshot, wipeLearnSession]
  );

  const gotoMove = useCallback(
    (ply: number) => {
      const line = loadedLineRef.current;
      if (!line) {
        return { success: false, message: "No game loaded. Call load-game first.", data: null };
      }
      logLessonDebug("visual", "goto-move", { requestedPly: ply, lineId: line.id, total: line.moves.length });
      const ok = rebuildToPly(line, ply);
      return {
        success: ok,
        message: ok ? `Jumped to ply ${line.ply}` : "Could not reach that ply",
        data: { ply: line.ply, total: line.moves.length },
      };
    },
    [rebuildToPly]
  );

  const animateThenPlay = useCallback(
    (from: Position, to: Position, options?: { isCancelled?: () => boolean }) => {
      const piece = boardRef.current.pieces.find((p) => p.samePosition(from));
      if (!piece) {
        return Promise.resolve(false);
      }
      const team = piece.team as "w" | "b";
      const token = ++animTokenRef.current;
      logLessonDebug("visual", "hand-animate", {
        from: coordinatesToNotation(from.x, from.y),
        to: coordinatesToNotation(to.x, to.y),
        team,
        piece: piece.type,
      });
      setAnimating(true);
      return new Promise<boolean>((resolve) => {
        animateMove(from, to, team, () => {
          const stale = animTokenRef.current !== token;
          const cancelled = options?.isCancelled?.() === true;
          if (stale || cancelled) {
            if (animTokenRef.current === token) {
              setAnimating(false);
            }
            resolve(false);
            return;
          }
          const success = playMoveSync(from, to);
          if (animTokenRef.current === token) {
            setAnimating(false);
          }
          resolve(success);
        });
      });
    },
    [animateMove, boardRef, playMoveSync]
  );

  const playMovesOnBoard = useCallback((board: Board, moves: string[]): boolean => {
    return applyMovesToBoard(board, moves);
  }, []);

  const playMovesAnimated = useCallback(
    async (moves: string[]): Promise<{ played: string[]; stoppedAt?: string }> => {
      const played: string[] = [];
      for (const move of moves) {
        const parsed = parseMoveOrCastle(move, boardRef.current.currentTeam);
        const fromCoords = chessNotationToCoordinates(parsed.from);
        const toCoords = chessNotationToCoordinates(parsed.to);
        const from = new Position(fromCoords.x, fromCoords.y);
        const to = new Position(toCoords.x, toCoords.y);
        const ok = await animateThenPlay(from, to);
        logLessonDebug("visual", "play-line-move", {
          move,
          from: parsed.from,
          to: parsed.to,
          success: ok,
          fen: fenForDebug(boardRef.current),
        });
        clearAnnotations();
        if (!ok) {
          return { played, stoppedAt: move };
        }
        played.push(move);
      }
      return { played };
    },
    [animateThenPlay, boardRef, clearAnnotations]
  );

  const playLine = useCallback(
    (moves?: string[], count?: number) => {
      const run = async () => {
        enterLearnMode();
        let sequence = moves;
        const line = loadedLineRef.current;
        if (!sequence || sequence.length === 0) {
          if (!line) {
            return {
              success: false,
              message: "Provide moves or load-game first.",
              data: null,
            };
          }
          const remaining = line.moves.slice(line.ply);
          sequence = typeof count === "number" ? remaining.slice(0, count) : remaining;
        } else if (!line && !activeLessonNumberRef.current) {
          loadedLineRef.current = {
            id: "custom",
            name: "Line",
            moves: sequence,
            notes: [],
            ply: 0,
          };
        }

        if (!sequence) {
          return {
            success: false,
            message: "Provide moves or load-game first.",
            data: null,
          };
        }

        const current = loadedLineRef.current;
        const teaching = Boolean(activeLessonNumberRef.current && coachRef.current);
        const playingCatalog = !!(
          current &&
          sequence.every((move, idx) => current.moves[current.ply + idx] === move)
        );

        ensureStartingSnapshot();

        const played: string[] = [];
        for (let i = 0; i < sequence.length; i++) {
          const parsed = parseMoveOrCastle(sequence[i], boardRef.current.currentTeam);
          const fromCoords = chessNotationToCoordinates(parsed.from);
          const toCoords = chessNotationToCoordinates(parsed.to);
          const from = new Position(fromCoords.x, fromCoords.y);
          const to = new Position(toCoords.x, toCoords.y);
          const ok = await animateThenPlay(from, to);
          logLessonDebug("visual", "play-line-move", {
            move: sequence[i],
            from: parsed.from,
            to: parsed.to,
            success: ok,
            fen: fenForDebug(boardRef.current),
          });
          clearAnnotations();
          if (!ok) {
            return {
              success: false,
              message: `Stopped at ${sequence[i]}`,
              data: { played },
            };
          }
          played.push(sequence[i]);
          if (current) {
            current.ply += 1;
          }
          if (!teaching && current && (playingCatalog || !moves || moves.length === 0)) {
            const note = noteForPly(current, current.ply);
            const nextCoach: CoachState = {
              title: current.name,
              body: note || `Played ${sequence[i]}`,
              step: current.ply,
              totalSteps: current.moves.length,
            };
            coachRef.current = nextCoach;
            setCoachState(nextCoach);
            pushSnapshot();
          }
        }

        if (teaching) {
          updateCurrentSnapshot();
        }

        return {
          success: true,
          message: `Played ${played.length} move(s)`,
          data: { played },
        };
      };

      const next = playChainRef.current.then(run, run);
      playChainRef.current = next.then(
        () => undefined,
        () => undefined
      );
      return next;
    },
    [animateThenPlay, boardRef, clearAnnotations, enterLearnMode, ensureStartingSnapshot, pushSnapshot, updateCurrentSnapshot]
  );

  const presentShowMeLesson = useCallback(
    (args: {
      title: string;
      body: string;
      paragraphs: string[];
      moves: string[];
      fen?: string;
      lesson?: number;
    }) => {
      wipeLearnSession();
      if (args.fen) {
        try {
          applyBoard(boardFromFen(args.fen, true));
        } catch (error) {
          return {
            success: false,
            message: `${error}`,
            lesson: 0,
            title: args.title,
            screen: "showme" as const,
          };
        }
      }

      const existing =
        typeof args.lesson === "number" ? findUserLessonByNumber(args.lesson) : undefined;
      const created =
        existing && isShowmeLesson(existing)
          ? existing
          : createCatalogLesson({
              title: args.title,
              body: args.body,
              paragraphs: args.paragraphs,
              kind: "showme",
            });
      const lessonNumber = created.number as number;
      activeLessonNumberRef.current = lessonNumber;
      const fromFen = boardToFen(boardRef.current);
      const coach = coachFromShowme({
        title: args.title,
        body: args.body,
        paragraphs: args.paragraphs,
        lesson: lessonNumber,
        moves: args.moves,
        fromFen,
      });
      coachRef.current = coach;
      setCoachState(coach);
      persistLesson({
        id: customLessonId(lessonNumber),
        kind: "showme",
        title: args.title,
        body: args.body,
        paragraphs: args.paragraphs,
        number: lessonNumber,
        moves: args.moves,
        fen: fromFen,
        steps: [],
      });
      pushSnapshot();
      logLessonDebug("visual", "create-lesson-showme", {
        lesson: lessonNumber,
        title: args.title,
        moves: args.moves.length,
      });
      const result = {
        success: true,
        message: `Created showme lesson ${lessonNumber}: ${args.title}. One explanation. The line auto-plays; Pause, Stop, and Replay are on the coach. Next: how_to_ask_the_user.`,
        lesson: lessonNumber,
        title: args.title,
        screen: "showme" as const,
      };
      void playShowMeLineRef.current?.({ fromStart: true });
      return result;
    },
    [applyBoard, persistLesson, pushSnapshot, wipeLearnSession]
  );

  const rewindShowMeBoard = useCallback(() => {
    const current = coachRef.current;
    try {
      if (current?.fromFen) {
        applyBoard(boardFromFen(current.fromFen, true));
        return true;
      }
    } catch {
      // fall back to the starting learn position
    }
    applyBoard(startingLearnBoard());
    return true;
  }, [applyBoard]);

  const playShowMeLine = useCallback((options?: { fromStart?: boolean }) => {
    const coach = coachRef.current;
    if (!coach || !isShowmePhase(coach.phase) || !coach.moves || !coach.moves.length) {
      return Promise.resolve({
        success: false,
        message: "No showme line to play.",
        data: null as unknown,
      });
    }

    if (!options?.fromStart && showmePlaybackRef.current === "paused") {
      showmePlaybackRef.current = "playing";
      setShowmePlayback("playing");
      const resume = showmePauseWaitRef.current;
      showmePauseWaitRef.current = null;
      resume?.();
      logLessonDebug("visual", "showme-resume", { lesson: coach.lesson, ply: showmePlyRef.current });
      return Promise.resolve({
        success: true,
        message: "Resumed the line.",
        data: { ply: showmePlyRef.current },
      });
    }

    if (!options?.fromStart && showmePlaybackRef.current === "playing") {
      return Promise.resolve({
        success: true,
        message: "Already playing.",
        data: { ply: showmePlyRef.current },
      });
    }

    const planned = coach.moves;
    const startPly =
      options?.fromStart || showmePlyRef.current >= planned.length
        ? 0
        : showmePlyRef.current;
    const myGen = ++showmeGenRef.current;
    animTokenRef.current += 1;
    const resume = showmePauseWaitRef.current;
    showmePauseWaitRef.current = null;
    resume?.();
    cancelMoveAnimation?.();

    const previous = showmeRunRef.current;
    const run = (async () => {
      await previous;
      if (showmeGenRef.current !== myGen) {
        return {
          success: false,
          message: "Replaced by a newer playback.",
          data: null as unknown,
        };
      }
      if (startPly === 0) {
        rewindShowMeBoard();
      }
      showmePlyRef.current = startPly;
      setShowmePly(startPly);
      showmePlaybackRef.current = "playing";
      setShowmePlayback("playing");
      logLessonDebug("visual", "play-showme-line", {
        lesson: coach.lesson,
        moves: planned.length,
        fromPly: startPly,
      });

      const moves = coachRef.current?.moves || planned;
      for (let i = startPly; i < moves.length; i++) {
        while (
          showmePlaybackRef.current === "paused" &&
          showmeGenRef.current === myGen
        ) {
          await new Promise<void>((resolve) => {
            showmePauseWaitRef.current = resolve;
          });
        }
        if (showmeGenRef.current !== myGen) {
          return {
            success: false,
            message: "Stopped.",
            data: { ply: showmePlyRef.current },
          };
        }

        const parsed = parseMoveOrCastle(moves[i], boardRef.current.currentTeam);
        const fromCoords = chessNotationToCoordinates(parsed.from);
        const toCoords = chessNotationToCoordinates(parsed.to);
        const from = new Position(fromCoords.x, fromCoords.y);
        const to = new Position(toCoords.x, toCoords.y);
        const ok = await animateThenPlay(from, to, {
          isCancelled: () => showmeGenRef.current !== myGen,
        });
        if (showmeGenRef.current !== myGen) {
          return {
            success: false,
            message: "Stopped.",
            data: { ply: showmePlyRef.current },
          };
        }
        if (!ok) {
          showmePlaybackRef.current = "idle";
          setShowmePlayback("idle");
          return {
            success: false,
            message: `Stopped at ${moves[i]}`,
            data: { ply: i },
          };
        }
        showmePlyRef.current = i + 1;
        setShowmePly(i + 1);
        clearAnnotations();
      }

      if (showmeGenRef.current === myGen) {
        showmePlaybackRef.current = "idle";
        setShowmePlayback("idle");
      }
      return {
        success: true,
        message: `Played ${moves.length} move(s)`,
        data: { played: moves.length },
      };
    })();

    showmeRunRef.current = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }, [animateThenPlay, cancelMoveAnimation, clearAnnotations, rewindShowMeBoard]);

  playShowMeLineRef.current = playShowMeLine;

  const pauseShowMeLine = useCallback(() => {
    if (showmePlaybackRef.current !== "playing") {
      return;
    }
    showmePlaybackRef.current = "paused";
    setShowmePlayback("paused");
    logLessonDebug("visual", "showme-pause", { ply: showmePlyRef.current });
  }, []);

  const stopShowMeLine = useCallback(() => {
    showmeGenRef.current += 1;
    animTokenRef.current += 1;
    const resume = showmePauseWaitRef.current;
    showmePauseWaitRef.current = null;
    resume?.();
    showmePlaybackRef.current = "idle";
    setShowmePlayback("idle");
    showmePlyRef.current = 0;
    setShowmePly(0);
    cancelMoveAnimation?.();
    setAnimating(false);
    rewindShowMeBoard();
    logLessonDebug("visual", "showme-stop", { lesson: coachRef.current?.lesson });
  }, [cancelMoveAnimation, rewindShowMeBoard]);

  const replayShowMeLine = useCallback(() => {
    return playShowMeLine({ fromStart: true });
  }, [playShowMeLine]);

  const demonstratePiece = useCallback(
    (pieceName: string, square?: string, color?: string) => {
      wipeLearnSession({ resetBoard: false });
      const lesson = getPieceLesson(pieceName) || getPieceLesson(parsePieceType(pieceName));
      const type = parsePieceType(pieceName);
      const team = color ? parseTeam(color) : TeamType.OUR;
      const squareName = (square || (lesson ? lesson.defaultSquare : "d4")).toLowerCase();
      const coords = chessNotationToCoordinates(squareName);
      const position = new Position(coords.x, coords.y);
      const piece = createPiece(type, team, position, false);
      const next = new Board([piece], team === TeamType.OUR ? 1 : 2, true);
      applyBoard(next);

      const placed = boardRef.current.pieces[0];
      const marks: BoardHighlight[] = [
        { square: squareName, kind: "key" },
      ];
      const destinations: string[] = [];
      (placed.possibleMoves || []).forEach((move) => {
        const name = coordinatesToNotation(move.x, move.y);
        destinations.push(name);
        const occupied = boardRef.current.pieces.some((p) => p.samePosition(move));
        marks.push({ square: name, kind: occupied ? "capture" : "move" });
      });
      applyOverlays(marks, [], {
        title: lesson ? lesson.title : type,
        body: lesson ? lesson.body : `Legal destinations from ${squareName}.`,
      });
      pushSnapshot();
      persistLesson({
        id: `piece:${type}:${squareName}:${team}`,
        kind: "piece",
        title: lesson ? lesson.name : type,
        body: lesson ? lesson.body : `Legal destinations from ${squareName}.`,
        piece: type,
        square: squareName,
        color: team,
      });
      return {
        success: true,
        message: `Showing ${type} on ${squareName}`,
        data: { square: squareName, destinations },
      };
    },
    [applyBoard, applyOverlays, boardRef, persistLesson, pushSnapshot, wipeLearnSession]
  );

  const projectLessonHistory = useCallback(
    (item: SavedLesson): LessonSnapshot[] => {
      const slides = projectLessonSession(item, boardToFen(startingLearnBoard()));
      restoringRef.current = true;
      resetHistory();
      slides.forEach((slide) => {
        applyBoard(boardFromFen(slide.fen, true));
        applyOverlays(slide.highlights, slide.arrows, slide.coach);
        const restoredQuiz = slide.quiz
          ? { ...slide.quiz, correct: [...slide.quiz.correct], answered: false, timedOut: false }
          : null;
        lastQuizRef.current = restoredQuiz;
        setQuiz(restoredQuiz);
        setQuizFeedback("");
        if (loadedLineRef.current) {
          loadedLineRef.current.ply = slide.ply;
        }
        pushSnapshot();
      });
      restoringRef.current = false;
      return historyRef.current;
    },
    [applyBoard, applyOverlays, pushSnapshot, resetHistory, setQuiz, setQuizFeedback]
  );

  const refreshViewingLesson = useCallback(
    (lessonNumber: number) => {
      if (activeLessonNumberRef.current !== lessonNumber) {
        return;
      }
      const item = findUserLessonByNumber(lessonNumber);
      if (!item) {
        return;
      }
      const live = takeSnapshot();
      const liveExperiment = experimentRef.current.map((snap) => ({
        ...snap,
        board: snap.board.clone(),
        highlights: snap.highlights.map((mark) => ({ ...mark })),
        arrows: snap.arrows.map((arrow) => ({ ...arrow })),
        coach: cloneCoach(snap.coach),
        quiz: snap.quiz
          ? { ...snap.quiz, correct: [...snap.quiz.correct] }
          : null,
      }));
      const liveExperimentIndex = experimentIndexRef.current;
      const keep = Math.max(0, historyIndexRef.current);
      projectLessonHistory(item);
      const index = Math.min(keep, Math.max(0, historyRef.current.length - 1));
      applyBoard(live.board.clone());
      applyOverlays(
        live.highlights.map((mark) => ({ ...mark })),
        live.arrows.map((arrow) => ({ ...arrow })),
        cloneCoach(live.coach)
      );
      lastQuizRef.current = live.quiz
        ? { ...live.quiz, correct: [...live.quiz.correct] }
        : null;
      setQuiz(lastQuizRef.current);
      experimentRef.current = liveExperiment;
      publishExperiment(liveExperimentIndex, liveExperiment.length);
      publishHistory(index, historyRef.current.length);
    },
    [applyBoard, applyOverlays, projectLessonHistory, publishExperiment, publishHistory, setQuiz, takeSnapshot]
  );

  const restoreCustomLesson = useCallback(
    (item: SavedLesson, options?: { fromStart?: boolean }) => {
      wipeLearnSession();
      activeLessonNumberRef.current = item.number || null;
      const moves = item.moves || [];
      const lineId =
        item.kind === "game"
          ? item.gameId || item.id.replace(/^game:/, "")
          : item.id;
      if (moves.length > 0) {
        loadedLineRef.current = {
          id: lineId,
          name: item.title,
          moves,
          notes: item.notes || [],
          ply: 0,
        };
      } else {
        loadedLineRef.current = null;
      }
      const snaps = projectLessonHistory(item);
      const slides = projectLessonSession(item, boardToFen(startingLearnBoard()));
      const lastTeaching = lastTeachingSlideIndex(slides);
      const activeIndex = options?.fromStart === false ? lastTeaching : 0;
      if (snaps[activeIndex]) {
        restoreSnapshot(snaps[activeIndex]);
        publishHistory(activeIndex, snaps.length);
      }
      return {
        success: true,
        message: `Opened ${item.title}`,
        data: { id: item.id, lesson: item.number, steps: slides.length },
      };
    },
    [projectLessonHistory, publishHistory, restoreSnapshot, wipeLearnSession]
  );

  const lessonHasTeaching = (item: SavedLesson) => {
    const steps = lessonSteps(item);
    return steps.some((step) =>
      Boolean(
        step.quiz ||
        (step.highlights && step.highlights.length > 0) ||
        (step.arrows && step.arrows.length > 0)
      )
    );
  };

  const openSavedLesson = useCallback(
    (id: string) => {
      const item = findUserLesson(id);
      if (!item) {
        return {
          success: false,
          message: `No saved lesson "${id}".`,
          data: null,
        };
      }
      resolveWait({ action: item.id, source: "catalog", label: item.title });
      if (isShowmeLesson(item)) {
        return presentShowMeLesson({
          title: item.title,
          body: item.body,
          paragraphs: item.paragraphs || [],
          moves: item.moves || [],
          fen: item.fen,
          lesson: item.number,
        });
      }
      restoringRef.current = true;
      try {
        if (item.kind === "game") {
          if (lessonHasTeaching(item)) {
            return restoreCustomLesson(item, { fromStart: true });
          }
          const game = getFamousGame(item.gameId || item.id.replace(/^game:/, ""));
          if (game) {
            return applyFamousGame(game);
          }
          return restoreCustomLesson(item, { fromStart: true });
        }
        if (item.kind === "piece" && item.piece) {
          return demonstratePiece(item.piece, item.square, item.color);
        }
        return restoreCustomLesson(item, { fromStart: true });
      } finally {
        restoringRef.current = false;
      }
    },
    [applyFamousGame, demonstratePiece, presentShowMeLesson, resolveWait, restoreCustomLesson]
  );

  const loadGame = useCallback(
    (id: string) => {
      const game = getFamousGame(id);
      if (game) {
        return applyFamousGame(game);
      }
      const saved = findUserLesson(id);
      if (saved) {
        return openSavedLesson(saved.id);
      }
      return {
        success: false,
        message: `Unknown game "${id}". Use list-lessons.`,
        data: { games: FAMOUS_GAMES.map((item) => item.id) },
      };
    },
    [applyFamousGame, openSavedLesson]
  );

  const deleteSavedLesson = useCallback((id: string) => {
    setUserLessons(removeUserLesson(id));
  }, []);

  const askQuiz = useCallback((
    nextQuiz: QuizState,
    options?: { signal?: AbortSignal }
  ) => {
    logLessonDebug("visual", "ask-quiz", {
      question: nextQuiz.question,
      type: nextQuiz.type,
      correct: nextQuiz.correct,
    });
    enterLearnMode();
    cancelQuiz();
    const liveQuiz: QuizState = {
      ...nextQuiz,
      correct: [...nextQuiz.correct],
      timedOut: false,
      answered: false,
    };
    lastQuizRef.current = liveQuiz;
    setQuiz(liveQuiz);
    setQuizFeedback("");
    setQuizSecondsLeft(QUIZ_TIMEOUT_SECONDS);
    setHighlights((prev) =>
      prev.filter((mark) => mark.kind !== "wrong" && mark.kind !== "correct")
    );
    return new Promise<QuizResult>((resolve) => {
      quizResolverRef.current = resolve;
      const deadline = Date.now() + QUIZ_TIMEOUT_MS;
      persistedQuizDeadline = deadline;
      quizTimerRef.current = window.setTimeout(expireQuiz, QUIZ_TIMEOUT_MS);
      quizTickRef.current = window.setInterval(() => {
        const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        setQuizSecondsLeft(left);
        if (left <= 0) {
          expireQuiz();
        }
      }, 250);
      const signal = options?.signal;
      if (!signal) {
        return;
      }
      const onAbort = () => expireQuiz();
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort);
      quizAbortCleanupRef.current = () => signal.removeEventListener("abort", onAbort);
    });
  }, [cancelQuiz, enterLearnMode, expireQuiz]);

  const waitForUser = useCallback((
    next: WaitForUserState,
    options?: { signal?: AbortSignal }
  ) => {
    logLessonDebug("visual", "wait-for-user", {
      prompt: next.prompt,
      choices: next.choices,
    });
    enterLearnMode();
    cancelQuiz({ keepAnswered: true });
    const prompt = next.prompt;
    const choices = next.choices.map((choice) => ({ ...choice }));
    setWait({
      prompt,
      choices,
      timedOut: false,
    });
    return new Promise<WaitForUserResult>((resolve) => {
      waitResolverRef.current = resolve;
      waitTimerRef.current = window.setTimeout(expireWait, WAIT_TIMEOUT_MS);
      const signal = options?.signal;
      if (!signal) {
        return;
      }
      const onAbort = () => expireWait();
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort);
      waitAbortCleanupRef.current = () => signal.removeEventListener("abort", onAbort);
    });
  }, [cancelQuiz, enterLearnMode, expireWait]);

  const onSquareClick = useCallback(
    (square: string) => {
      answerQuiz(square);
    },
    [answerQuiz]
  );

  const recordLearnMove = useCallback(() => {
    logLessonDebug("visual", "record-learn-move", {
      fen: fenForDebug(boardRef.current),
    });
    clearAnnotations();
    const snap = takeSnapshot();
    if (experimentRef.current.length === 0) {
      experimentRef.current = [snap];
      publishExperiment(0, 1);
      return;
    }
    const kept = truncateItems(experimentRef.current, experimentIndexRef.current);
    kept.push(snap);
    experimentRef.current = kept;
    publishExperiment(kept.length - 1, kept.length);
  }, [boardRef, clearAnnotations, publishExperiment, takeSnapshot]);

  const undoLearnMove = useCallback(() => {
    if (animating || experimentIndexRef.current <= 0) {
      return;
    }
    const nextIndex = experimentIndexRef.current - 1;
    logLessonDebug("visual", "undo-learn-move", {
      fromIndex: experimentIndexRef.current,
      toIndex: nextIndex,
    });
    restoreSnapshot(experimentRef.current[nextIndex], { keepExperiment: true });
    publishExperiment(nextIndex, experimentRef.current.length);
  }, [animating, publishExperiment, restoreSnapshot]);

  const redoLearnMove = useCallback(() => {
    if (animating || experimentIndexRef.current >= experimentRef.current.length - 1) {
      return;
    }
    const nextIndex = experimentIndexRef.current + 1;
    logLessonDebug("visual", "redo-learn-move", {
      fromIndex: experimentIndexRef.current,
      toIndex: nextIndex,
    });
    restoreSnapshot(experimentRef.current[nextIndex], { keepExperiment: true });
    publishExperiment(nextIndex, experimentRef.current.length);
  }, [animating, publishExperiment, restoreSnapshot]);

  const stepBack = useCallback(() => {
    if (animating || historyIndexRef.current <= 0) {
      return;
    }
    logLessonDebug("visual", "step-back", {
      fromIndex: historyIndexRef.current,
      toIndex: historyIndexRef.current - 1,
    });
    const nextIndex = historyIndexRef.current - 1;
    restoreSnapshot(historyRef.current[nextIndex]);
    publishHistory(nextIndex, historyRef.current.length);
  }, [animating, publishHistory, restoreSnapshot]);

  const stepFirst = useCallback(() => {
    if (animating || historyIndexRef.current <= 0) {
      return;
    }
    logLessonDebug("visual", "step-first", {
      fromIndex: historyIndexRef.current,
    });
    restoreSnapshot(historyRef.current[0]);
    publishHistory(0, historyRef.current.length);
  }, [animating, publishHistory, restoreSnapshot]);

  const stepLast = useCallback(() => {
    if (animating) {
      return;
    }
    const line = loadedLineRef.current;
    logLessonDebug("visual", "step-last", {
      historyIndex: historyIndexRef.current,
      historyLength: historyRef.current.length,
      ply: line ? line.ply : null,
    });
    if (line && line.ply < line.moves.length) {
      rebuildToPly(line, line.moves.length);
      return;
    }
    const lastIndex = historyRef.current.length - 1;
    if (lastIndex < 0 || historyIndexRef.current >= lastIndex) {
      return;
    }
    restoreSnapshot(historyRef.current[lastIndex]);
    publishHistory(lastIndex, historyRef.current.length);
  }, [animating, publishHistory, rebuildToPly, restoreSnapshot]);

  const stepNext = useCallback(() => {
    if (animating) {
      return;
    }
    logLessonDebug("visual", "step-next", {
      historyIndex: historyIndexRef.current,
      historyLength: historyRef.current.length,
      ply: loadedLineRef.current ? loadedLineRef.current.ply : null,
    });
    if (historyIndexRef.current >= 0 && historyIndexRef.current < historyRef.current.length - 1) {
      const nextIndex = historyIndexRef.current + 1;
      restoreSnapshot(historyRef.current[nextIndex]);
      publishHistory(nextIndex, historyRef.current.length);
      return;
    }
    const line = loadedLineRef.current;
    if (line && line.ply < line.moves.length) {
      playLine(undefined, 1);
      return;
    }
    const currentWait = waitRef.current;
    if (!currentWait || currentWait.timedOut) {
      return;
    }
    const choice = continueWaitChoice(currentWait.choices);
    logLessonDebug("user-move", "wait-choice", {
      action: choice.id,
      label: choice.label,
      source: "next",
    });
    resolveWait({ action: choice.id, source: "choice", label: choice.label });
  }, [animating, playLine, publishHistory, resolveWait, restoreSnapshot]);

  const createLesson = useCallback((args: {
    title: string;
    paragraphs?: string[];
    type?: string;
    moves?: string[];
    fen?: string;
  }) => {
    const format = parseLessonFormat(args.type);
    const notationError = coachNotationViolation([args.title, ...(args.paragraphs || [])]);
    if (notationError) {
      return {
        success: false,
        message: notationError,
        lesson: 0,
        title: args.title,
        screen: format === "showme" ? ("showme" as const) : ("goal" as const),
      };
    }
    if (format === "showme") {
      const resolved = resolveShowMeLesson({
        title: args.title,
        paragraphs: args.paragraphs,
        moves: args.moves,
        fen: args.fen,
      });
      if (!resolved.ok) {
        return {
          success: false,
          message: resolved.message,
          lesson: 0,
          title: "",
          screen: "showme" as const,
        };
      }
      return presentShowMeLesson(resolved);
    }

    const copy = normalizeCoachCopy({ body: "", paragraphs: args.paragraphs || [] });
    const created = createCatalogLesson({
      title: args.title,
      body: copy.body,
      paragraphs: copy.paragraphs,
    });
    rememberDraftLesson(created.number || null);
    setUserLessons(readUserCatalog());
    logLessonDebug("visual", "create-lesson", {
      lesson: created.number,
      title: created.title,
    });
    return {
      success: true,
      message: `Created catalog lesson ${created.number}: ${created.title}. Goal screen is stored; the live session was not changed. Next: add-lesson-step with lesson: ${created.number}. The student opens it from My lessons.`,
      lesson: created.number as number,
      title: created.title,
      screen: "goal" as const,
    };
  }, [presentShowMeLesson, rememberDraftLesson]);

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
      const draft: LessonStepDraft = {
        title: args.title,
        why: args.why || "",
        what: args.what || "",
        type,
        paragraphs: args.paragraphs,
        moves: args.moves,
        question,
        correct,
        hint: args.hint,
        quizType: args.quizType,
      };
      const failed = (message: string, lesson = 0) => ({
        success: false,
        message,
        lesson,
        step: 0,
        totalSteps: 0,
        screen: isRiddle ? ("riddle" as const) : ("step" as const),
        nextTools: isRiddle
          ? ["add-lesson-step"]
          : ["add-lesson-step", "set-lesson-recap"],
        recapWritten: false,
        recapExpected: !isRiddle,
      });
      if (isRiddle) {
        if (!question || !correct.length) {
          return failed("A riddle needs question and at least one correct square.");
        }
        if (!draft.title.trim()) {
          draft.title = "Riddle";
        }
      } else if (!draft.title.trim() || !draft.why.trim() || !draft.what.trim()) {
        return failed("Each step needs title, why (situation/goal), and what (the move).");
      }
      const notationError = coachNotationViolation(
        [draft.title, draft.why, draft.what, question, args.hint, ...(draft.paragraphs || [])],
        draft.moves
      );
      if (notationError) {
        return failed(notationError);
      }
      const lessonNumber = args.lesson || draftLessonNumberRef.current;
      if (!lessonNumber) {
        return failed("Call create-lesson first, then add-lesson-step with that lesson number.");
      }
      const existing = findUserLessonByNumber(lessonNumber);
      if (!existing) {
        return failed(`No lesson ${lessonNumber}. Call create-lesson first.`, lessonNumber);
      }
      if (isShowmeLesson(existing)) {
        return failed(
          `Lesson ${lessonNumber} is a show-me demo (one explanation, live play). For a stepped lesson, call create-lesson.`,
          lessonNumber
        );
      }
      rememberDraftLesson(lessonNumber);
      const lessonTitle = existing.title;
      const startTeaching = teachingSteps(lessonSteps(existing)).length;
      const totalTeaching = startTeaching + 1;
      const fromFen = fenAfterTeaching(existing);
      const moves = isRiddle ? [] : resolveStepMoves(draft.what, draft.moves);
      const coach = coachFromDraft(draft, {
        lessonTitle,
        lesson: lessonNumber,
        step: totalTeaching,
        totalSteps: totalTeaching,
        fromFen,
        moves,
      });
      const quiz: QuizState | undefined = isRiddle
        ? {
            question,
            type: args.quizType || "click-square",
            correct,
            hint: args.hint,
          }
        : undefined;
      const catalog = upsertLessonStep({
        lessonNumber,
        lessonTitle,
        step: {
          title: coach.title,
          body: coach.body,
          paragraphs: coach.paragraphs,
          what: coach.what,
          why: coach.why,
          kind: isRiddle ? "riddle" : "step",
          moves: isRiddle ? undefined : moves,
          fen: fromFen,
          quiz,
        },
      });
      setUserLessons(catalog);
      refreshViewingLesson(lessonNumber);
      logLessonDebug("visual", "add-lesson-step", {
        lesson: lessonNumber,
        step: totalTeaching,
        totalSteps: totalTeaching,
        type,
      });
      const recapExpected = lessonExpectsRecap(totalTeaching);
      return {
        success: true,
        message: recapExpected
          ? `Stored teaching step ${totalTeaching} of lesson ${lessonNumber} in the catalog (not a recap). Live session unchanged. Next: add-lesson-step for another beat, OR set-lesson-recap if this was the last beat.`
          : `Stored the only teaching step of lesson ${lessonNumber} in the catalog. Live session unchanged. No recap. For a riddle, call how_to_offer_a_hint then add-lesson-step with type riddle.`,
        lesson: lessonNumber,
        step: totalTeaching,
        totalSteps: totalTeaching,
        screen: isRiddle ? ("riddle" as const) : ("step" as const),
        nextTools: recapExpected
          ? ["add-lesson-step", "set-lesson-recap"]
          : isRiddle
            ? ["how_to_ask_the_user"]
            : ["add-lesson-step"],
        recapWritten: false,
        recapExpected,
      };
    },
    [refreshViewingLesson, rememberDraftLesson]
  );

  const applyLessonRecap = useCallback(
    (args: { lesson?: number; title?: string; paragraphs: string[] }) => {
      const lessonNumber = args.lesson || draftLessonNumberRef.current;
      if (!lessonNumber) {
        return {
          success: false,
          message: "Call create-lesson first, then set-lesson-recap.",
          lesson: 0,
        };
      }
      const existing = findUserLessonByNumber(lessonNumber);
      if (!existing) {
        return {
          success: false,
          message: `No lesson ${lessonNumber}.`,
          lesson: lessonNumber,
        };
      }
      if (isShowmeLesson(existing)) {
        return {
          success: false,
          message: `Lesson ${lessonNumber} is a show-me demo. There is no recap. Call how_to_ask_the_user.`,
          lesson: lessonNumber,
        };
      }
      if (!args.paragraphs.length) {
        return {
          success: false,
          message: "Provide recap paragraphs.",
          lesson: lessonNumber,
        };
      }
      const notationError = coachNotationViolation([args.title, ...args.paragraphs]);
      if (notationError) {
        return {
          success: false,
          message: notationError,
          lesson: lessonNumber,
        };
      }
      rememberDraftLesson(lessonNumber);
      const catalog = setLessonRecap(lessonNumber, {
        title: args.title,
        paragraphs: args.paragraphs,
      });
      setUserLessons(catalog);
      refreshViewingLesson(lessonNumber);
      logLessonDebug("visual", "set-lesson-recap", { lesson: lessonNumber });
      return {
        success: true,
        message: `Recap saved for catalog lesson ${lessonNumber}. Recap is not a numbered step. Live session unchanged. The student reaches it with Next after the last teaching step. Then call how_to_ask_the_user.`,
        lesson: lessonNumber,
      };
    },
    [refreshViewingLesson, rememberDraftLesson]
  );

  const addLessonSteps = useCallback(
    async (args: {
      lesson?: number;
      steps: LessonStepDraft[];
      summary?: LessonSummaryDraft;
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
      const addFromDraft = (draft: LessonStepDraft, lesson?: number) =>
        addLessonStep({
          lesson,
          title: draft.title,
          why: draft.why,
          what: draft.what,
          type: draft.type,
          paragraphs: draft.paragraphs,
          moves: draft.moves,
          question: draft.question,
          correct: draft.correct,
          hint: draft.hint,
          quizType: draft.quizType,
        });
      let last = await addFromDraft(args.steps[0], args.lesson);
      for (let i = 1; i < args.steps.length; i++) {
        last = await addFromDraft(args.steps[i], args.lesson || last.lesson);
      }
      return last;
    },
    [addLessonStep]
  );

  const playCoachMove = useCallback(async (notation: string) => {
    const coach = coachRef.current;
    if (!coach || isRecapPhase(coach.phase) || isShowmePhase(coach.phase) || coach.phase === "riddle") {
      return { success: false, message: "No move to play on this screen." };
    }
    const moves = resolveStepMoves(coach.what, coach.moves);
    const states = coachPlayMoves({
      board: boardRef.current,
      moves,
      fromFen: coach.fromFen,
      currentFen: boardToFen(boardRef.current),
    });
    const target = states.find((item) => item.notation === notation);
    if (!target || target.status !== "ready") {
      return { success: false, message: "That move is not available on the board right now." };
    }
    const played = await playMovesAnimated([target.notation]);
    if (played.stoppedAt) {
      return { success: false, message: `Could not play ${notation}` };
    }
    updateCurrentSnapshot();
    return { success: true, message: `Played ${notation}` };
  }, [boardRef, playMovesAnimated, updateCurrentSnapshot]);

  const listLessons = useCallback(() => {
    return {
      games: FAMOUS_GAMES.map((game) => ({
        id: game.id,
        name: game.name,
        year: game.year,
        hook: game.hook,
        moves: game.moves.length,
      })),
      pieces: PIECE_LESSONS.map((item) => ({
        id: item.id,
        name: item.name,
      })),
      saved: userLessons.map((item) => ({
        number: item.number,
        id: item.id,
        title: item.title,
        kind: item.kind,
        steps: teachingSteps(lessonSteps(item)).length,
      })),
      quiz: [
        "click-square — user clicks a square on the board",
        "click-piece — user clicks a piece",
      ],
      notation: COACH_NOTATION_RULE,
      learningTypes: {
        lesson:
          "create-lesson type lesson (default) — Goal, then add-lesson-step Why/Move beats.",
        showme:
          "create-lesson type showme — one explanation; the planned line auto-plays with Pause, Stop, and Replay on the coach.",
        riddle: "add-lesson-step type riddle — a puzzle on a catalog lesson.",
      },
    };
  }, [userLessons]);

  const savedLesson =
    typeof coach?.lesson === "number"
      ? userLessons.find((item) => item.number === coach.lesson)
      : undefined;
  const teachingCount = savedLesson
    ? teachingSteps(lessonSteps(savedLesson)).length
    : coach?.totalSteps || 0;
  const recapOnFile = Boolean(
    savedLesson?.recap?.paragraphs && savedLesson.recap.paragraphs.length
  );
  const expectsRecap = lessonExpectsRecap(teachingCount, savedLesson?.recap);

  return {
    learnMode,
    coach,
    highlights,
    arrows,
    quiz,
    quizFeedback,
    quizSecondsLeft,
    wait,
    animating,
    showmePlayback,
    showmePly,
    historyIndex,
    historyLength,
    userLessons,
    loadedLine: loadedLineRef,
    enterLearnMode,
    exitLearnMode,
    setCoach,
    createLesson,
    addLessonStep,
    applyLessonRecap,
    addLessonSteps,
    annotateBoard,
    clearLesson,
    setPosition,
    loadGame,
    gotoMove,
    playLine,
    playShowMeLine,
    pauseShowMeLine,
    stopShowMeLine,
    replayShowMeLine,
    demonstratePiece,
    askQuiz,
    waitForUser,
    onWaitChoice: (action: string, label?: string) => {
      if (wait?.timedOut) {
        return;
      }
      logLessonDebug("user-move", "wait-choice", { action, label: label || action });
      resolveWait({ action, source: "choice", label: label || action });
    },
    onSquareClick,
    answerQuiz,
    recordLearnMove,
    undoLearnMove,
    redoLearnMove,
    canUndoLearnMove: !animating && canUndoExperiment(experimentCursor),
    canRedoLearnMove: !animating && canRedoExperiment(experimentCursor),
    stepBack,
    stepNext,
    stepFirst,
    stepLast,
    playCoachMove,
    coachPlayMoves:
      coach &&
      !isRecapPhase(coach.phase) &&
      !isShowmePhase(coach.phase) &&
      coach.phase !== "riddle"
        ? coachPlayMoves({
            board: boardRef.current,
            moves: resolveStepMoves(coach.what, coach.moves),
            fromFen: coach.fromFen,
            currentFen: boardToFen(boardRef.current),
          })
        : [],
    expectsRecap,
    awaitingContinuation: Boolean(
      coach &&
      typeof coach.lesson === "number" &&
      historyIndex >= 0 &&
      historyIndex >= historyLength - 1 &&
      (
        coach.phase === "goal" ||
        (coach.phase === "step" && expectsRecap && !recapOnFile)
      )
    ),
    listLessons,
    clearAnnotations,
    openSavedLesson,
    deleteSavedLesson,
    endLesson: wipeLearnSession,
  };
}
