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
import {
  BoardArrow,
  BoardHighlight,
  CoachState,
  LoadedLine,
  QuizState,
  SavedLesson,
} from "../lessons/types";
import {
  findUserLesson,
  lessonSlug,
  readUserCatalog,
  removeUserLesson,
  upsertUserLesson,
} from "../lessons/userCatalog";
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
  parseMoveNotation,
} from "../utils/chess-notation-utils";
import { logLessonDebug } from "../lessons/debugLog";
import { overlaySnapshot, piecesForDebug } from "../lessons/debugSnapshot";

type LessonSnapshot = {
  board: Board;
  highlights: BoardHighlight[];
  arrows: BoardArrow[];
  coach: CoachState | null;
  ply: number;
};

type ParkedLearnSession = {
  history: LessonSnapshot[];
  historyIndex: number;
  loadedLine: LoadedLine | null;
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
  hideCheckmate: () => void;
};

export function useChessLessons({
  boardRef,
  setBoard,
  playMoveSync,
  animateMove,
  hideCheckmate,
}: Args) {
  const [learnMode, setLearnMode] = useState(false);
  const [coach, setCoachState] = useState<CoachState | null>(null);
  const [highlights, setHighlights] = useState<BoardHighlight[]>([]);
  const [arrows, setArrows] = useState<BoardArrow[]>([]);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<string>("");
  const [animating, setAnimating] = useState(false);

  const learnModeRef = useRef(false);
  const parkedRef = useRef<ParkedLearnSession | null>(null);
  const loadedLineRef = useRef<LoadedLine | null>(null);
  const quizResolverRef = useRef<((result: { correct: boolean; square: string }) => void) | null>(null);
  const playChainRef = useRef<Promise<unknown>>(Promise.resolve());
  const highlightsRef = useRef<BoardHighlight[]>([]);
  const arrowsRef = useRef<BoardArrow[]>([]);
  const coachRef = useRef<CoachState | null>(null);
  const historyRef = useRef<LessonSnapshot[]>([]);
  const historyIndexRef = useRef(-1);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [historyLength, setHistoryLength] = useState(0);
  const [userLessons, setUserLessons] = useState<SavedLesson[]>([]);
  const restoringRef = useRef(false);

  useEffect(() => {
    setUserLessons(readUserCatalog());
  }, []);

  const persistLesson = useCallback((lesson: Omit<SavedLesson, "savedAt">) => {
    if (restoringRef.current) {
      return;
    }
    setUserLessons(upsertUserLesson(lesson));
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

  const cancelQuiz = useCallback(() => {
    if (quizResolverRef.current) {
      quizResolverRef.current({ correct: false, square: "" });
      quizResolverRef.current = null;
    }
    setQuiz(null);
    setQuizFeedback("");
  }, []);

  const publishHistory = useCallback((index: number, length: number) => {
    historyIndexRef.current = index;
    setHistoryIndex(index);
    setHistoryLength(length);
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
      ply: loadedLineRef.current ? loadedLineRef.current.ply : Math.max(0, historyIndexRef.current),
    };
  }, [boardRef]);

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
    (snap: LessonSnapshot) => {
      logLessonDebug("visual", "restore-snapshot", {
        ply: snap.ply,
        pieces: piecesForDebug(snap.board),
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
      if (loadedLineRef.current) {
        loadedLineRef.current.ply = snap.ply;
      }
    },
    [applyBoard, applyOverlays, cancelQuiz]
  );

  const resetHistory = useCallback(() => {
    historyRef.current = [];
    publishHistory(-1, 0);
  }, [publishHistory]);

  const pushSnapshot = useCallback(() => {
    const snap = takeSnapshot();
    const next = historyRef.current.slice(0, historyIndexRef.current + 1);
    next.push(snap);
    historyRef.current = next;
    publishHistory(next.length - 1, next.length);
  }, [publishHistory, takeSnapshot]);

  const updateCurrentSnapshot = useCallback(() => {
    const snap = takeSnapshot();
    if (historyRef.current.length === 0 || historyIndexRef.current < 0) {
      historyRef.current = [snap];
      publishHistory(0, 1);
      return;
    }
    historyRef.current[historyIndexRef.current] = snap;
  }, [publishHistory, takeSnapshot]);

  const ensureStartingSnapshot = useCallback(() => {
    if (historyRef.current.length === 0) {
      pushSnapshot();
    }
  }, [pushSnapshot]);

  const persistCurrentLesson = useCallback(() => {
    const line = loadedLineRef.current;
    const coach = coachRef.current;
    if (line && line.id !== "custom") {
      persistLesson({
        id: `game:${line.id}`,
        kind: "game",
        title: line.name,
        body: coach ? coach.body : "",
        gameId: line.id,
        moves: line.moves,
        notes: line.notes,
        fen: boardToFen(boardRef.current),
        highlights: highlightsRef.current.map((item) => ({ ...item })),
        arrows: arrowsRef.current.map((item) => ({ ...item })),
      });
      return;
    }
    if (!coach && !line) {
      return;
    }
    const title = coach ? coach.title : line.name;
    persistLesson({
      id: `custom:${lessonSlug(title)}`,
      kind: "custom",
      title,
      body: coach ? coach.body : "",
      fen: boardToFen(boardRef.current),
      highlights: highlightsRef.current.map((item) => ({ ...item })),
      arrows: arrowsRef.current.map((item) => ({ ...item })),
      moves: line ? line.moves : undefined,
      notes: line ? line.notes : undefined,
    });
  }, [boardRef, persistLesson]);

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
        pieces: piecesForDebug(snap.board),
      });
      parkedRef.current = null;
      loadedLineRef.current = parked.loadedLine;
      historyRef.current = parked.history;
      publishHistory(index, parked.history.length);
      restoreSnapshot(snap);
      learnModeRef.current = true;
      setLearnMode(true);
      return;
    }
    logLessonDebug("visual", "enter-learn-mode", { pieces: piecesForDebug(boardRef.current) });
    learnModeRef.current = true;
    setLearnMode(true);
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
    persistCurrentLesson();
    parkedRef.current = {
      history: historyRef.current,
      historyIndex: historyIndexRef.current,
      loadedLine: loadedLineRef.current,
    };
    if (quizResolverRef.current) {
      quizResolverRef.current({ correct: false, square: "" });
      quizResolverRef.current = null;
    }
    loadedLineRef.current = null;
    resetHistory();
    highlightsRef.current = [];
    arrowsRef.current = [];
    coachRef.current = null;
    learnModeRef.current = false;
    setLearnMode(false);
    setCoachState(null);
    setHighlights([]);
    setArrows([]);
    setQuiz(null);
    setQuizFeedback("");
    const reset = startingPlayBoard();
    boardRef.current = reset;
    setBoard(reset);
  }, [boardRef, persistCurrentLesson, resetHistory, setBoard, updateCurrentSnapshot]);

  const setCoach = useCallback((next: CoachState) => {
    logLessonDebug("visual", "set-coach", { title: next.title, body: next.body, step: next.step, totalSteps: next.totalSteps });
    enterLearnMode();
    coachRef.current = next;
    setCoachState(next);
    updateCurrentSnapshot();
    const line = loadedLineRef.current;
    if (line && line.id !== "custom") {
      persistLesson({
        id: `game:${line.id}`,
        kind: "game",
        title: line.name,
        body: next.body,
        gameId: line.id,
        moves: line.moves,
        notes: line.notes,
      });
      return;
    }
    persistLesson({
      id: `custom:${lessonSlug(next.title)}`,
      kind: "custom",
      title: next.title,
      body: next.body,
      fen: boardToFen(boardRef.current),
      highlights: highlightsRef.current.map((item) => ({ ...item })),
      arrows: arrowsRef.current.map((item) => ({ ...item })),
      moves: line ? line.moves : undefined,
      notes: line ? line.notes : undefined,
    });
  }, [boardRef, enterLearnMode, persistLesson, updateCurrentSnapshot]);

  const annotateBoard = useCallback(
    (nextHighlights: BoardHighlight[], nextArrows: BoardArrow[]) => {
      logLessonDebug("visual", "annotate-board", {
        pieces: piecesForDebug(boardRef.current),
        ...overlaySnapshot({
          highlights: nextHighlights,
          arrows: nextArrows,
          coachTitle: coachRef.current ? coachRef.current.title : null,
        }),
      });
      enterLearnMode();
      highlightsRef.current = nextHighlights;
      arrowsRef.current = nextArrows;
      setHighlights(nextHighlights);
      setArrows(nextArrows);
      updateCurrentSnapshot();
      const coach = coachRef.current;
      const line = loadedLineRef.current;
      if (coach) {
        persistLesson({
          id:
            line && line.id !== "custom"
              ? `game:${line.id}`
              : `custom:${lessonSlug(coach.title)}`,
          kind: line && line.id !== "custom" ? "game" : "custom",
          title: line && line.id !== "custom" ? line.name : coach.title,
          body: coach.body,
          gameId: line && line.id !== "custom" ? line.id : undefined,
          fen: boardToFen(boardRef.current),
          highlights: nextHighlights.map((item) => ({ ...item })),
          arrows: nextArrows.map((item) => ({ ...item })),
          moves: line ? line.moves : undefined,
          notes: line ? line.notes : undefined,
        });
      }
    },
    [boardRef, enterLearnMode, persistLesson, updateCurrentSnapshot]
  );

  const clearLesson = useCallback(() => {
    logLessonDebug("visual", "clear-lesson", {});
    coachRef.current = null;
    highlightsRef.current = [];
    arrowsRef.current = [];
    setCoachState(null);
    setHighlights([]);
    setArrows([]);
    setQuiz(null);
    setQuizFeedback("");
    if (quizResolverRef.current) {
      quizResolverRef.current({ correct: false, square: "" });
      quizResolverRef.current = null;
    }
    updateCurrentSnapshot();
  }, [updateCurrentSnapshot]);

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
          fen: args.fen || null,
          piecesArg: args.pieces || null,
          turn: args.turn || null,
          boardPieces: piecesForDebug(next),
        });
        pushSnapshot();
        const coach = coachRef.current;
        if (coach) {
          persistLesson({
            id: `custom:${lessonSlug(coach.title)}`,
            kind: "custom",
            title: coach.title,
            body: coach.body,
            fen: boardToFen(next),
            highlights: highlightsRef.current.map((item) => ({ ...item })),
            arrows: arrowsRef.current.map((item) => ({ ...item })),
          });
        }
        return { success: true, message: "Position set" };
      } catch (error) {
        return { success: false, message: `${error}` };
      }
    },
    [applyBoard, cancelQuiz, clearAnnotations, discardParkedLesson, hideCheckmate, persistLesson, pushSnapshot]
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
      const parsed = parseMoveNotation(line.moves[i]);
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
      hideCheckmate();
      discardParkedLesson();
      learnModeRef.current = true;
      setLearnMode(true);
      setQuiz(null);
      setQuizFeedback("");
      const line: LoadedLine = {
        id: game.id,
        name: game.name,
        moves: game.moves,
        notes: game.notes || [],
        ply: 0,
      };
      loadedLineRef.current = line;
      resetHistory();
      applyBoard(startingLearnBoard());
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
    [applyBoard, applyOverlays, discardParkedLesson, hideCheckmate, persistLesson, pushSnapshot, resetHistory]
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
    (from: Position, to: Position) => {
      const piece = boardRef.current.pieces.find((p) => p.samePosition(from));
      if (!piece) {
        return Promise.resolve(false);
      }
      const team = piece.team as "w" | "b";
      logLessonDebug("visual", "hand-animate", {
        from: coordinatesToNotation(from.x, from.y),
        to: coordinatesToNotation(to.x, to.y),
        team,
        piece: piece.type,
      });
      setAnimating(true);
      return new Promise<boolean>((resolve) => {
        animateMove(from, to, team, () => {
          const success = playMoveSync(from, to);
          setAnimating(false);
          resolve(success);
        });
      });
    },
    [animateMove, boardRef, playMoveSync]
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
        } else if (!line) {
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
        const playingCatalog = !!(
          current &&
          sequence.every((move, idx) => current.moves[current.ply + idx] === move)
        );

        ensureStartingSnapshot();

        const played: string[] = [];
        for (let i = 0; i < sequence.length; i++) {
          const parsed = parseMoveNotation(sequence[i]);
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
            pieces: piecesForDebug(boardRef.current),
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
          if (current && (playingCatalog || !moves || moves.length === 0)) {
            current.ply += 1;
            const note = noteForPly(current, current.ply);
            const nextCoach: CoachState = {
              title: current.name,
              body: note || `Played ${sequence[i]}`,
              step: current.ply,
              totalSteps: current.moves.length,
            };
            coachRef.current = nextCoach;
            setCoachState(nextCoach);
          }
          pushSnapshot();
        }

        if (current) {
          const coach = coachRef.current;
          persistLesson({
            id:
              current.id === "custom"
                ? `custom:${lessonSlug(coach ? coach.title : current.name)}`
                : `game:${current.id}`,
            kind: current.id === "custom" ? "custom" : "game",
            title: coach ? coach.title : current.name,
            body: coach ? coach.body : "",
            gameId: current.id === "custom" ? undefined : current.id,
            moves: current.moves,
            notes: current.notes,
            fen: boardToFen(boardRef.current),
          });
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
    [animateThenPlay, boardRef, clearAnnotations, enterLearnMode, ensureStartingSnapshot, persistLesson, pushSnapshot]
  );

  const demonstratePiece = useCallback(
    (pieceName: string, square?: string, color?: string) => {
      hideCheckmate();
      discardParkedLesson();
      learnModeRef.current = true;
      setLearnMode(true);
      setQuiz(null);
      setQuizFeedback("");
      arrowsRef.current = [];
      setArrows([]);
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
      loadedLineRef.current = null;
      resetHistory();
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
    [applyBoard, applyOverlays, boardRef, discardParkedLesson, hideCheckmate, persistLesson, pushSnapshot, resetHistory]
  );

  const restoreCustomLesson = useCallback(
    (item: SavedLesson) => {
      hideCheckmate();
      discardParkedLesson();
      learnModeRef.current = true;
      setLearnMode(true);
      cancelQuiz();
      resetHistory();
      const moves = item.moves || [];
      if (moves.length > 0 && !item.fen) {
        loadedLineRef.current = {
          id: item.id,
          name: item.title,
          moves,
          notes: item.notes || [],
          ply: 0,
        };
        applyBoard(startingLearnBoard());
      } else if (item.fen) {
        loadedLineRef.current =
          moves.length > 0
            ? {
                id: item.id,
                name: item.title,
                moves,
                notes: item.notes || [],
                ply: 0,
              }
            : null;
        applyBoard(boardFromFen(item.fen, true));
      } else {
        loadedLineRef.current = null;
        applyBoard(startingLearnBoard());
      }
      applyOverlays(
        (item.highlights || []).map((mark) => ({ ...mark })),
        (item.arrows || []).map((arrow) => ({ ...arrow })),
        {
          title: item.title,
          body: item.body,
          step: 0,
          totalSteps: moves.length || undefined,
        }
      );
      pushSnapshot();
      return {
        success: true,
        message: `Opened ${item.title}`,
        data: { id: item.id },
      };
    },
    [applyBoard, applyOverlays, cancelQuiz, discardParkedLesson, hideCheckmate, pushSnapshot, resetHistory]
  );

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
      restoringRef.current = true;
      try {
        if (item.kind === "game") {
          const game = getFamousGame(item.gameId || item.id.replace(/^game:/, ""));
          if (game) {
            return applyFamousGame(game);
          }
          return restoreCustomLesson(item);
        }
        if (item.kind === "piece" && item.piece) {
          return demonstratePiece(item.piece, item.square, item.color);
        }
        return restoreCustomLesson(item);
      } finally {
        restoringRef.current = false;
      }
    },
    [applyFamousGame, demonstratePiece, restoreCustomLesson]
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

  const askQuiz = useCallback((nextQuiz: QuizState) => {
    logLessonDebug("visual", "ask-quiz", {
      question: nextQuiz.question,
      type: nextQuiz.type,
      correct: nextQuiz.correct,
    });
    enterLearnMode();
    setQuiz(nextQuiz);
    setQuizFeedback("");
    setHighlights((prev) =>
      prev.filter((mark) => mark.kind !== "wrong" && mark.kind !== "correct")
    );
    if (quizResolverRef.current) {
      quizResolverRef.current({ correct: false, square: "" });
    }
    return new Promise<{ correct: boolean; square: string }>((resolve) => {
      quizResolverRef.current = resolve;
    });
  }, [enterLearnMode]);

  const onSquareClick = useCallback(
    (square: string) => {
      if (!quiz) {
        return;
      }
      const normalized = square.toLowerCase();
      const correctList = quiz.correct.map((item) => item.toLowerCase());
      const correct = correctList.indexOf(normalized) !== -1;
      logLessonDebug("user-move", "quiz-click", {
        square: normalized,
        correct,
        expected: correctList,
        question: quiz.question,
      });
      const resolver = quizResolverRef.current;
      quizResolverRef.current = null;
      if (resolver) {
        resolver({ correct, square: normalized });
      }
      setQuiz(null);
      setQuizFeedback("");
      highlightsRef.current = [];
      arrowsRef.current = [];
      setHighlights([]);
      setArrows([]);
    },
    [quiz]
  );

  const recordLearnMove = useCallback(() => {
    logLessonDebug("visual", "record-learn-move", {
      pieces: piecesForDebug(boardRef.current),
    });
    clearAnnotations();
    pushSnapshot();
  }, [boardRef, clearAnnotations, pushSnapshot]);

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
    if (!line || line.ply >= line.moves.length) {
      return;
    }
    playLine(undefined, 1);
  }, [animating, playLine, publishHistory, restoreSnapshot]);

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
        id: item.id,
        title: item.title,
        kind: item.kind,
      })),
      quiz: [
        "click-square — user clicks a square on the board",
        "click-piece — user clicks a piece",
      ],
    };
  }, [userLessons]);

  return {
    learnMode,
    coach,
    highlights,
    arrows,
    quiz,
    quizFeedback,
    animating,
    historyIndex,
    historyLength,
    userLessons,
    loadedLine: loadedLineRef,
    enterLearnMode,
    exitLearnMode,
    setCoach,
    annotateBoard,
    clearLesson,
    setPosition,
    loadGame,
    gotoMove,
    playLine,
    demonstratePiece,
    askQuiz,
    onSquareClick,
    recordLearnMove,
    stepBack,
    stepNext,
    listLessons,
    clearAnnotations,
    openSavedLesson,
    deleteSavedLesson,
  };
}
