import { useEffect, useRef } from 'react';
import { Board } from '../models/Board';
import { Piece } from '../models/Piece';
import { Position } from '../models/Position';
import { PieceType } from '../Types';
import { chessNotationToCoordinates, parseMoveNotation } from '../utils/chess-notation-utils';
import { getModelContext } from '../model-context-types';
import { logLessonDebug } from '../lessons/debugLog';
import { BoardArrow, BoardHighlight, CoachState, QuizState } from '../lessons/types';
import { PlacedPiece } from '../utils/board-setup';

type ToolResponse = {
  success: boolean;
  message: string;
  data: unknown;
};

type LessonActions = {
  learnMode: boolean;
  enterLearnMode: () => void;
  exitLearnMode: () => void;
  setCoach: (coach: CoachState) => void;
  annotateBoard: (highlights: BoardHighlight[], arrows: BoardArrow[]) => void;
  clearLesson: () => void;
  setPosition: (args: { fen?: string; pieces?: PlacedPiece[]; turn?: string }) => { success: boolean; message: string };
  loadGame: (id: string) => { success: boolean; message: string; data: unknown };
  gotoMove: (ply: number) => { success: boolean; message: string; data: unknown };
  playLine: (moves?: string[], count?: number) => Promise<{ success: boolean; message: string; data: unknown }>;
  demonstratePiece: (piece: string, square?: string, color?: string) => { success: boolean; message: string; data: unknown };
  askQuiz: (quiz: QuizState) => Promise<{ correct: boolean; square: string }>;
  listLessons: () => unknown;
};

type ChessActions = {
  getBoard: () => Board;
  playMove: (piece: Piece, destination: Position) => boolean;
  restartGame: () => void;
  promotePawn: (pieceType: PieceType) => void;
  animateMove?: (from: Position, to: Position, team: 'w' | 'b', onComplete?: () => void) => void;
  lessons: LessonActions;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item) => typeof item === 'string') as string[];
}

export function useModelContextTools(actions: ChessActions) {
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  useEffect(() => {
    const mc = getModelContext();
    if (!mc) {
      return;
    }

    const tools = [
      {
        name: 'get-board-state',
        description: 'Retrieves the current state of the chess board including piece positions, current turn, total moves, game status, and whether learn mode is on.',
        inputSchema: { type: 'object', properties: {} },
        execute: async (): Promise<ToolResponse> => {
          const board = actionsRef.current.getBoard();
          return {
            success: true,
            message: 'Board state retrieved successfully',
            data: {
              learnMode: actionsRef.current.lessons.learnMode,
              pieces: board.pieces.map(piece => ({
                type: piece.type,
                team: piece.team,
                position: { x: piece.position.x, y: piece.position.y },
                hasMoved: piece.hasMoved,
                possibleMoves: piece.possibleMoves?.map(m => ({ x: m.x, y: m.y })) || [],
              })),
              totalTurns: board.totalTurns,
              currentTeamTurn: board.currentTeam,
              winningTeam: board.winningTeam,
            },
          };
        },
      },
      {
        name: 'make-move',
        description: 'Makes a chess move. Provide the move as "from:to" (e.g., "e2:e4"). In learn mode, either side may move. Animates with the hand.',
        inputSchema: {
          type: 'object',
          properties: {
            move: {
              type: 'string',
              description: 'Move in format "from:to" (e.g., "e2:e4")',
              default: 'e2:e4',
            },
          },
          required: ['move'],
        },
        execute: async (params: Record<string, unknown>): Promise<ToolResponse> => {
          try {
            const board = actionsRef.current.getBoard();
            const { from: fromNotation, to: toNotation } = parseMoveNotation(params.move as string);
            const fromCoords = chessNotationToCoordinates(fromNotation);
            const toCoords = chessNotationToCoordinates(toNotation);

            const from = new Position(fromCoords.x, fromCoords.y);
            const to = new Position(toCoords.x, toCoords.y);

            const piece = board.pieces.find(p => p.samePosition(from));
            if (!piece) {
              return { success: false, message: `No piece at ${fromNotation}`, data: null };
            }

            const doMove = () => {
              const success = actionsRef.current.playMove(piece, to);
              return {
                success,
                message: success ? `Moved ${piece.type} from ${fromNotation} to ${toNotation}` : `Invalid move ${fromNotation} to ${toNotation}`,
                data: { from: fromNotation, to: toNotation, piece: piece.type, team: piece.team },
              };
            };

            if (actionsRef.current.animateMove) {
              return new Promise<ToolResponse>((resolve) => {
                actionsRef.current.animateMove!(from, to, piece.team as 'w' | 'b', () => {
                  resolve(doMove());
                });
              });
            }

            return doMove();
          } catch (error) {
            return { success: false, message: `Move failed: ${error}`, data: null };
          }
        },
      },
      {
        name: 'get-possible-moves',
        description: 'Gets all legal moves for a piece. Prefer algebraic square (e.g. "e2"); x/y coordinates also work.',
        inputSchema: {
          type: 'object',
          properties: {
            square: {
              type: 'string',
              description: 'Algebraic square such as e2',
            },
            position: {
              type: 'object',
              properties: {
                x: { type: 'number', minimum: 0, maximum: 7, description: 'X coordinate (0=a, 7=h)' },
                y: { type: 'number', minimum: 0, maximum: 7, description: 'Y coordinate (0=rank 1, 7=rank 8)' },
              },
            },
          },
        },
        execute: async (params: Record<string, unknown>): Promise<ToolResponse> => {
          const board = actionsRef.current.getBoard();
          let x: number;
          let y: number;
          if (typeof params.square === 'string') {
            const coords = chessNotationToCoordinates(params.square);
            x = coords.x;
            y = coords.y;
          } else {
            const pos = params.position as { x: number; y: number } | undefined;
            if (!pos) {
              return { success: false, message: 'Provide square or position', data: { possibleMoves: [] } };
            }
            x = pos.x;
            y = pos.y;
          }
          const position = new Position(x, y);
          const piece = board.pieces.find(p => p.samePosition(position));

          if (!piece) {
            return { success: false, message: `No piece at (${x}, ${y})`, data: { possibleMoves: [] } };
          }

          const possibleMoves = piece.possibleMoves?.map(m => ({ x: m.x, y: m.y })) || [];
          return {
            success: true,
            message: `${possibleMoves.length} moves for ${piece.type} at (${x}, ${y})`,
            data: { piece: { type: piece.type, team: piece.team }, possibleMoves },
          };
        },
      },
      {
        name: 'restart-game',
        description: 'Restarts the chess game to initial position.',
        inputSchema: { type: 'object', properties: {} },
        execute: async (): Promise<ToolResponse> => {
          actionsRef.current.restartGame();
          return { success: true, message: 'Game restarted', data: null };
        },
      },
      {
        name: 'promote-pawn',
        description: 'Promotes a pawn to queen, rook, bishop, or knight.',
        inputSchema: {
          type: 'object',
          properties: {
            pieceType: {
              type: 'string',
              enum: ['queen', 'rook', 'bishop', 'knight'],
              description: 'Piece type to promote to.',
            },
          },
          required: ['pieceType'],
        },
        execute: async (params: Record<string, unknown>): Promise<ToolResponse> => {
          actionsRef.current.promotePawn(params.pieceType as PieceType);
          return { success: true, message: `Pawn promoted to ${params.pieceType}`, data: null };
        },
      },
      {
        name: 'enter-learn-mode',
        description: 'Switch the app into interactive learning mode. Use before teaching, famous games, piece demos, or quizzes. Disables checkmate so teaching positions can omit kings.',
        inputSchema: { type: 'object', properties: {} },
        execute: async (): Promise<ToolResponse> => {
          actionsRef.current.lessons.enterLearnMode();
          return { success: true, message: 'Learn mode on. Coach panel is visible.', data: null };
        },
      },
      {
        name: 'exit-learn-mode',
        description: 'Leave learning mode and restore a standard playable game.',
        inputSchema: { type: 'object', properties: {} },
        execute: async (): Promise<ToolResponse> => {
          actionsRef.current.lessons.exitLearnMode();
          return { success: true, message: 'Learn mode off. Board reset to starting position.', data: null };
        },
      },
      {
        name: 'list-lessons',
        description: 'Lists famous games, piece tutorials, and quiz types the user can ask for.',
        inputSchema: { type: 'object', properties: {} },
        execute: async (): Promise<ToolResponse> => ({
          success: true,
          message: 'Available lessons',
          data: actionsRef.current.lessons.listLessons(),
        }),
      },
      {
        name: 'set-position',
        description: 'Set the board from FEN or a list of pieces. Enters learn mode. Example pieces: [{ "square": "d4", "type": "knight", "color": "w" }].',
        inputSchema: {
          type: 'object',
          properties: {
            fen: { type: 'string', description: 'FEN string, e.g. 8/8/8/8/3N4/8/8/8 w - - 0 1' },
            pieces: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  square: { type: 'string' },
                  type: { type: 'string' },
                  color: { type: 'string', description: 'w or b' },
                },
              },
            },
            turn: { type: 'string', description: 'w or b' },
          },
        },
        execute: async (params: Record<string, unknown>): Promise<ToolResponse> => {
          const pieces = Array.isArray(params.pieces) ? params.pieces as PlacedPiece[] : undefined;
          const result = actionsRef.current.lessons.setPosition({
            fen: typeof params.fen === 'string' ? params.fen : undefined,
            pieces,
            turn: typeof params.turn === 'string' ? params.turn : undefined,
          });
          return { success: result.success, message: result.message, data: null };
        },
      },
      {
        name: 'set-coach',
        description: 'Show a lesson title and explanation in the coach panel next to the board. Do not rely on the tool return text — users only see this panel.',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            body: { type: 'string', description: 'Short explanation for the student' },
            step: { type: 'number' },
            totalSteps: { type: 'number' },
          },
          required: ['title', 'body'],
        },
        execute: async (params: Record<string, unknown>): Promise<ToolResponse> => {
          actionsRef.current.lessons.setCoach({
            title: String(params.title || ''),
            body: String(params.body || ''),
            step: typeof params.step === 'number' ? params.step : undefined,
            totalSteps: typeof params.totalSteps === 'number' ? params.totalSteps : undefined,
          });
          return { success: true, message: 'Coach panel updated', data: null };
        },
      },
      {
        name: 'annotate-board',
        description: 'Highlight squares and draw arrows on the board. kinds: move, capture, key, wrong, correct.',
        inputSchema: {
          type: 'object',
          properties: {
            highlights: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  square: { type: 'string' },
                  kind: { type: 'string', enum: ['move', 'capture', 'key', 'wrong', 'correct'] },
                },
              },
            },
            arrows: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  from: { type: 'string' },
                  to: { type: 'string' },
                  color: { type: 'string' },
                },
              },
            },
          },
        },
        execute: async (params: Record<string, unknown>): Promise<ToolResponse> => {
          const highlights = Array.isArray(params.highlights) ? params.highlights as BoardHighlight[] : [];
          const arrows = Array.isArray(params.arrows) ? params.arrows as BoardArrow[] : [];
          actionsRef.current.lessons.annotateBoard(highlights, arrows);
          return { success: true, message: 'Board annotations updated', data: { highlights: highlights.length, arrows: arrows.length } };
        },
      },
      {
        name: 'clear-lesson',
        description: 'Clear coach text, highlights, arrows, and any pending quiz. Stays in learn mode.',
        inputSchema: { type: 'object', properties: {} },
        execute: async (): Promise<ToolResponse> => {
          actionsRef.current.lessons.clearLesson();
          return { success: true, message: 'Lesson overlay cleared', data: null };
        },
      },
      {
        name: 'load-game',
        description: 'Load a curated famous game by id or name (scholars-mate, fools-mate, italian-game, opera-game). Sets the starting position. Then call play-line.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Catalog id or game name' },
          },
          required: ['id'],
        },
        execute: async (params: Record<string, unknown>): Promise<ToolResponse> => {
          return actionsRef.current.lessons.loadGame(String(params.id || ''));
        },
      },
      {
        name: 'goto-move',
        description: 'Jump to a ply in the loaded game (0 = start). Rebuilds the position without animation.',
        inputSchema: {
          type: 'object',
          properties: {
            ply: { type: 'number', description: 'Number of half-moves from the start' },
          },
          required: ['ply'],
        },
        execute: async (params: Record<string, unknown>): Promise<ToolResponse> => {
          return actionsRef.current.lessons.gotoMove(Number(params.ply));
        },
      },
      {
        name: 'play-line',
        description: 'Play moves on the board with the hand animation. Omit moves to continue the loaded famous game. count limits how many half-moves to play.',
        inputSchema: {
          type: 'object',
          properties: {
            moves: {
              type: 'array',
              items: { type: 'string' },
              description: 'Moves as from:to, e.g. ["e2:e4", "e7:e5"]',
            },
            count: { type: 'number', description: 'If continuing a loaded game, how many plies to play' },
          },
        },
        execute: async (params: Record<string, unknown>): Promise<ToolResponse> => {
          const moves = asStringArray(params.moves);
          const count = typeof params.count === 'number' ? params.count : undefined;
          return actionsRef.current.lessons.playLine(moves.length ? moves : undefined, count);
        },
      },
      {
        name: 'demonstrate-piece',
        description: 'Empty-ish board with one piece, legal-move highlights, and a coach explanation of how that piece moves.',
        inputSchema: {
          type: 'object',
          properties: {
            piece: {
              type: 'string',
              description: 'pawn, knight, bishop, rook, queen, or king',
            },
            square: { type: 'string', description: 'Optional square, e.g. d4' },
            color: { type: 'string', description: 'w or b' },
          },
          required: ['piece'],
        },
        execute: async (params: Record<string, unknown>): Promise<ToolResponse> => {
          try {
            return actionsRef.current.lessons.demonstratePiece(
              String(params.piece),
              typeof params.square === 'string' ? params.square : undefined,
              typeof params.color === 'string' ? params.color : undefined
            );
          } catch (error) {
            return { success: false, message: `${error}`, data: null };
          }
        },
      },
      {
        name: 'ask-quiz',
        description: 'Show a question in the coach panel and wait until the user clicks a square on the board. Returns whether they clicked a correct square. This tool waits for the click.',
        inputSchema: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            type: {
              type: 'string',
              enum: ['click-square', 'click-piece', 'choose-move'],
            },
            correct: {
              type: 'array',
              items: { type: 'string' },
              description: 'Acceptable squares such as ["e5", "e4"]',
            },
            hint: { type: 'string' },
          },
          required: ['question', 'correct'],
        },
        execute: async (params: Record<string, unknown>): Promise<ToolResponse> => {
          const correct = asStringArray(params.correct);
          if (!correct.length) {
            return { success: false, message: 'Provide at least one correct square', data: null };
          }
          const result = await actionsRef.current.lessons.askQuiz({
            question: String(params.question || ''),
            type: (params.type as QuizState['type']) || 'click-square',
            correct,
            hint: typeof params.hint === 'string' ? params.hint : undefined,
          });
          return {
            success: result.correct,
            message: result.correct ? `Correct: ${result.square}` : `Clicked ${result.square || '(cancelled)'}`,
            data: result,
          };
        },
      },
    ];

    const toolNames = tools.map(t => t.name);
    const wrappedTools = tools.map((tool) => ({
      ...tool,
      execute: async (params: Record<string, unknown>): Promise<ToolResponse> => {
        const started = Date.now();
        logLessonDebug("tool", tool.name, { phase: "start", params: params || {} });
        try {
          const result = await tool.execute(params);
          logLessonDebug("tool", tool.name, {
            phase: "end",
            durationMs: Date.now() - started,
            params: params || {},
            result,
          });
          return result;
        } catch (error) {
          logLessonDebug("tool", tool.name, {
            phase: "error",
            durationMs: Date.now() - started,
            params: params || {},
            error: `${error}`,
          });
          throw error;
        }
      },
    }));
    const registration = new AbortController();

    function cleanupTools() {
      registration.abort();
      const ctx = getModelContext();
      if (!ctx) {
        return;
      }
      if (typeof ctx.clearContext === 'function') {
        ctx.clearContext();
        return;
      }
      if (typeof ctx.unregisterTool === 'function') {
        for (const name of toolNames) {
          try {
            ctx.unregisterTool(name);
          } catch {
            // Already unregistered or unsupported in this snapshot of the API.
          }
        }
      }
    }

    if (typeof mc.provideContext === 'function') {
      mc.provideContext({ tools: wrappedTools });
    } else if (typeof mc.registerTool === 'function') {
      for (const tool of wrappedTools) {
        if (typeof mc.unregisterTool === 'function') {
          try {
            mc.unregisterTool(tool.name);
          } catch {
            // ignore duplicate-unregister failures
          }
        }
        void Promise.resolve(mc.registerTool(tool, { signal: registration.signal })).catch(() => {
          // Duplicate names, aborted Strict Mode remounts, or unsupported snapshots.
        });
      }
    } else {
      return;
    }

    return () => {
      cleanupTools();
    };
  }, []);
}
