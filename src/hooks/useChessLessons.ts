import { Dispatch, MutableRefObject, SetStateAction, useCallback, useRef, useState } from "react";
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
} from "../lessons/types";
import {
  boardFromFen,
  boardFromPlacements,
  createPiece,
  parsePieceType,
  parseTeam,
  PlacedPiece,
  startingLearnBoard,
} from "../utils/board-setup";
import {
  chessNotationToCoordinates,
  coordinatesToNotation,
  parseMoveNotation,
} from "../utils/chess-notation-utils";

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

  const loadedLineRef = useRef<LoadedLine | null>(null);
  const quizResolverRef = useRef<((result: { correct: boolean; square: string }) => void) | null>(null);
  const playChainRef = useRef<Promise<unknown>>(Promise.resolve());

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
    setHighlights([]);
    setArrows([]);
  }, []);

  const cancelQuiz = useCallback(() => {
    if (quizResolverRef.current) {
      quizResolverRef.current({ correct: false, square: "" });
      quizResolverRef.current = null;
    }
    setQuiz(null);
    setQuizFeedback("");
  }, []);

  const enterLearnMode = useCallback(() => {
    hideCheckmate();
    setLearnMode(true);
    cancelQuiz();
    const next = boardRef.current.clone();
    applyBoard(next);
  }, [applyBoard, boardRef, cancelQuiz, hideCheckmate]);

  const exitLearnMode = useCallback(() => {
    if (quizResolverRef.current) {
      quizResolverRef.current({ correct: false, square: "" });
      quizResolverRef.current = null;
    }
    loadedLineRef.current = null;
    setLearnMode(false);
    setCoachState(null);
    setHighlights([]);
    setArrows([]);
    setQuiz(null);
    setQuizFeedback("");
    const reset = startingLearnBoard();
    reset.learnMode = false;
    reset.calculateAllMoves();
    boardRef.current = reset;
    setBoard(reset);
  }, [boardRef, setBoard]);

  const setCoach = useCallback((next: CoachState) => {
    setLearnMode(true);
    setCoachState(next);
  }, []);

  const annotateBoard = useCallback(
    (nextHighlights: BoardHighlight[], nextArrows: BoardArrow[]) => {
      setLearnMode(true);
      setHighlights(nextHighlights);
      setArrows(nextArrows);
    },
    []
  );

  const clearLesson = useCallback(() => {
    setCoachState(null);
    setHighlights([]);
    setArrows([]);
    setQuiz(null);
    setQuizFeedback("");
    if (quizResolverRef.current) {
      quizResolverRef.current({ correct: false, square: "" });
      quizResolverRef.current = null;
    }
  }, []);

  const setPosition = useCallback(
    (args: { fen?: string; pieces?: PlacedPiece[]; turn?: string }) => {
      hideCheckmate();
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
        return { success: true, message: "Position set" };
      } catch (error) {
        return { success: false, message: `${error}` };
      }
    },
    [applyBoard, cancelQuiz, clearAnnotations, hideCheckmate]
  );

  const noteForPly = (line: LoadedLine, ply: number): string | undefined => {
    const note = line.notes.find((item) => item.ply === ply);
    return note ? note.text : undefined;
  };

  const rebuildToPly = useCallback((line: LoadedLine, ply: number): boolean => {
    const target = Math.max(0, Math.min(ply, line.moves.length));
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
    setCoachState({
      title: line.name,
      body: note || (target === 0 ? "Starting position." : `After move ${target}.`),
      step: target,
      totalSteps: line.moves.length,
    });
    return true;
  }, [applyBoard, cancelQuiz, clearAnnotations]);

  const loadGame = useCallback(
    (id: string) => {
      const game = getFamousGame(id);
      if (!game) {
        return {
          success: false,
          message: `Unknown game "${id}". Use list-lessons.`,
          data: { games: FAMOUS_GAMES.map((item) => item.id) },
        };
      }
      hideCheckmate();
      setLearnMode(true);
      setQuiz(null);
      setQuizFeedback("");
      setHighlights([]);
      setArrows([]);
      const line: LoadedLine = {
        id: game.id,
        name: game.name,
        moves: game.moves,
        notes: game.notes || [],
        ply: 0,
      };
      loadedLineRef.current = line;
      applyBoard(startingLearnBoard());
      setCoachState({
        title: game.name,
        body: game.hook,
        step: 0,
        totalSteps: game.moves.length,
      });
      return {
        success: true,
        message: `Loaded ${game.name}. Use play-line or goto-move.`,
        data: { id: game.id, name: game.name, moves: game.moves.length },
      };
    },
    [applyBoard, hideCheckmate]
  );

  const gotoMove = useCallback(
    (ply: number) => {
      const line = loadedLineRef.current;
      if (!line) {
        return { success: false, message: "No game loaded. Call load-game first.", data: null };
      }
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

        const played: string[] = [];
        for (let i = 0; i < sequence.length; i++) {
          const parsed = parseMoveNotation(sequence[i]);
          const fromCoords = chessNotationToCoordinates(parsed.from);
          const toCoords = chessNotationToCoordinates(parsed.to);
          const from = new Position(fromCoords.x, fromCoords.y);
          const to = new Position(toCoords.x, toCoords.y);
          const ok = await animateThenPlay(from, to);
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
            setCoachState({
              title: current.name,
              body: note || `Played ${sequence[i]}`,
              step: current.ply,
              totalSteps: current.moves.length,
            });
          }
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
    [animateThenPlay, clearAnnotations, enterLearnMode]
  );

  const demonstratePiece = useCallback(
    (pieceName: string, square?: string, color?: string) => {
      hideCheckmate();
      setLearnMode(true);
      setQuiz(null);
      setQuizFeedback("");
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
      setHighlights(marks);
      setCoachState({
        title: lesson ? lesson.title : type,
        body: lesson ? lesson.body : `Legal destinations from ${squareName}.`,
      });
      loadedLineRef.current = null;
      return {
        success: true,
        message: `Showing ${type} on ${squareName}`,
        data: { square: squareName, destinations },
      };
    },
    [applyBoard, boardRef, hideCheckmate]
  );

  const askQuiz = useCallback((nextQuiz: QuizState) => {
    setLearnMode(true);
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
  }, []);

  const onSquareClick = useCallback(
    (square: string) => {
      if (!quiz) {
        return;
      }
      const normalized = square.toLowerCase();
      const correctList = quiz.correct.map((item) => item.toLowerCase());
      const correct = correctList.indexOf(normalized) !== -1;
      const resolver = quizResolverRef.current;
      quizResolverRef.current = null;
      if (resolver) {
        resolver({ correct, square: normalized });
      }
      setQuiz(null);
      setQuizFeedback("");
      setHighlights([]);
      setArrows([]);
    },
    [quiz]
  );

  const stepBack = useCallback(() => {
    const line = loadedLineRef.current;
    if (!line || line.ply <= 0 || animating) {
      return;
    }
    rebuildToPly(line, line.ply - 1);
  }, [animating, rebuildToPly]);

  const stepNext = useCallback(() => {
    const line = loadedLineRef.current;
    if (!line || line.ply >= line.moves.length || animating) {
      return;
    }
    playLine(undefined, 1);
  }, [animating, playLine]);

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
      quiz: [
        "click-square — user clicks a square on the board",
        "click-piece — user clicks a piece",
      ],
    };
  }, []);

  return {
    learnMode,
    coach,
    highlights,
    arrows,
    quiz,
    quizFeedback,
    animating,
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
    stepBack,
    stepNext,
    listLessons,
    clearAnnotations,
  };
}
