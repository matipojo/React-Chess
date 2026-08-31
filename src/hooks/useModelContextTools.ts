import { useEffect, useRef } from 'react';
import { Board } from '../models/Board';
import { Piece } from '../models/Piece';
import { Position } from '../models/Position';
import { PieceType } from '../Types';
import { chessNotationToCoordinates, parseMoveNotation } from '../utils/chess-notation-utils';
import { getModelContext } from '../model-context-types';
import { normalizeCoachCopy, splitCoachParagraphs } from '../lessons/coachParagraphs';
import { logLessonDebug } from '../lessons/debugLog';
import { compactToolResult } from '../lessons/debugSnapshot';
import { BoardHighlight, BoardArrow, CoachState, QuizState } from '../lessons/types';
import { PlacedPiece } from '../utils/board-setup';
import { COACH_NOTATION_RULE, WAIT_TURN_RULE } from '../lessons/coachNotation';
import { buildHowToAskTheUserPrompt, CHAT_BUTTON_TEXT, readBoardChatAccent } from '../lessons/howToAskTheUser';
import { parseStepDrafts, parseSummaryDraft } from '../lessons/lessonCopy';
import { compactImageParam, parseBackgroundToolArgs, preparePageBackground } from '../utils/pageBackground';

type ToolResponse = {
  success: boolean;
  message: string;
  data: unknown;
};

type LessonActions = {
  learnMode: boolean;
  enterLearnMode: () => void;
  exitLearnMode: () => void;
  setCoach: (coach: CoachState) => { lesson: number; step: number; totalSteps: number };
  createLesson: (args: { title: string; paragraphs?: string[] }) => {
    success: boolean;
    message: string;
    lesson: number;
    title: string;
  };
  addLessonStep: (args: {
    lesson?: number;
    title: string;
    why: string;
    what: string;
    paragraphs?: string[];
    moves?: string[];
  }) => {
    success: boolean;
    message: string;
    lesson: number;
    step: number;
    totalSteps: number;
    screen: "step";
    nextTools: string[];
    recapWritten: boolean;
    recapExpected: boolean;
  };
  applyLessonRecap: (args: { lesson?: number; title?: string; paragraphs: string[] }) => {
    success: boolean;
    message: string;
    lesson: number;
  };
  addLessonSteps: (args: {
    lesson?: number;
    steps: { title: string; what: string; why: string; paragraphs?: string[]; moves?: string[] }[];
    summary?: { title?: string; paragraphs: string[] };
  }) => Promise<{
    success: boolean;
    message: string;
    lesson: number;
    step: number;
    totalSteps: number;
    nextTools?: string[];
    recapWritten?: boolean;
    recapExpected?: boolean;
  }>;
  annotateBoard: (highlights?: BoardHighlight[], arrows?: BoardArrow[]) => void;
  clearLesson: () => void;
  setPosition: (args: { fen?: string; pieces?: PlacedPiece[]; turn?: string }) => { success: boolean; message: string };
  loadGame: (id: string) => { success: boolean; message: string; data: unknown };
  gotoMove: (ply: number) => { success: boolean; message: string; data: unknown };
  playLine: (moves?: string[], count?: number) => Promise<{ success: boolean; message: string; data: unknown }>;
  demonstratePiece: (piece: string, square?: string, color?: string) => { success: boolean; message: string; data: unknown };
  askQuiz: (quiz: QuizState, options?: { signal?: AbortSignal }) => Promise<{ correct: boolean; square: string; timedOut?: boolean }>;
  listLessons: () => unknown;
};

type ChessActions = {
  getBoard: () => Board;
  playMove: (piece: Piece, destination: Position) => boolean;
  restartGame: () => void;
  promotePawn: (pieceType: PieceType) => void;
  animateMove?: (from: Position, to: Position, team: 'w' | 'b', onComplete?: () => void) => void;
  lessons: LessonActions;
  setPageBackground: (cssUrl: string | null) => { persisted: boolean };
};

function compactToolParams(params: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const key of Object.keys(params)) {
    next[key] = compactImageParam(params[key]);
  }
  return next;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item) => typeof item === 'string') as string[];
}

function asPositiveInt(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const parsed = Number(value);
    if (parsed > 0) {
      return parsed;
    }
  }
  return undefined;
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
        description: 'Switch the app into interactive learning mode, or resume the previous lesson if one was saved by exit-learn-mode. Use before teaching, famous games, piece demos, or quizzes. Disables checkmate so teaching positions can omit kings. ' + COACH_NOTATION_RULE + ' ' + WAIT_TURN_RULE,
        inputSchema: { type: 'object', properties: {} },
        execute: async (): Promise<ToolResponse> => {
          actionsRef.current.lessons.enterLearnMode();
          return { success: true, message: 'Learn mode on. Coach panel is visible. ' + COACH_NOTATION_RULE, data: null };
        },
      },
      {
        name: 'exit-learn-mode',
        description: 'Leave learning mode, save the current lesson so it can be resumed, clear coaching overlays, and restore a standard playable game.',
        inputSchema: { type: 'object', properties: {} },
        execute: async (): Promise<ToolResponse> => {
          actionsRef.current.lessons.exitLearnMode();
          return { success: true, message: 'Learn mode off. Lesson saved. Re-enter learn to resume.', data: null };
        },
      },
      {
        name: 'list-lessons',
        description: 'Lists famous games, piece tutorials, and saved catalog lessons. Lesson screens: Goal (create-lesson), teaching Steps (add-lesson-step), Recap (set-lesson-recap, not a step, skip for one-step exams). After two or more steps, add another step or write the recap. ' + COACH_NOTATION_RULE,
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
        name: 'create-lesson',
        description:
          'Create a new catalog lesson and wipe the previous live session (board, coach, quiz, recap, history). Goal screen only: lasting title + what we will learn. Not a numbered step and not a recap. Call once per topic. Next: add-lesson-step. Do not call create-lesson again for the same topic. ' +
          COACH_NOTATION_RULE,
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Lesson topic shown for the whole lesson, e.g. "Italian Opening". Not the name of a single move.',
            },
            paragraphs: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional intro. What this lesson will teach, in 1–3 short paragraphs.',
            },
          },
          required: ['title'],
        },
        execute: async (params: Record<string, unknown>): Promise<ToolResponse> => {
          const title = String(params.title || '').trim();
          if (!title) {
            return { success: false, message: 'Provide a lesson title.', data: null };
          }
          const result = actionsRef.current.lessons.createLesson({
            title,
            paragraphs: asStringArray(params.paragraphs),
          });
          return {
            success: result.success,
            message: result.message,
            data: {
              lesson: result.lesson,
              title: result.title,
              screen: 'goal',
              nextTools: ['add-lesson-step'],
            },
          };
        },
      },
      {
        name: 'add-lesson-step',
        description:
          'Add ONE teaching Step (not a recap). Fast: no board playback. Why first, then the move; student taps Play. A one-step lesson (quiz/exam) has no recap and no Back/Next. After two or more steps, Next shows Generating... until you add-lesson-step or set-lesson-recap. Same lesson number. Never create-lesson again for the same topic. ' +
          COACH_NOTATION_RULE,
        inputSchema: {
          type: 'object',
          properties: {
            lesson: {
              type: 'number',
              description: 'Catalog number from create-lesson.',
            },
            title: { type: 'string', description: 'Beat heading, not the lesson title.' },
            why: { type: 'string', description: 'Situation and goal before the move.' },
            what: { type: 'string', description: 'Concrete move(s), English from:to such as e2:e4.' },
            paragraphs: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional extra detail.',
            },
            moves: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional from:to for Play buttons, e.g. ["e2:e4", "e7:e5"].',
            },
          },
          required: ['lesson', 'title', 'why', 'what'],
        },
        execute: async (params: Record<string, unknown>): Promise<ToolResponse> => {
          const result = actionsRef.current.lessons.addLessonStep({
            lesson: asPositiveInt(params.lesson),
            title: String(params.title || ''),
            why: String(params.why || ''),
            what: String(params.what || ''),
            paragraphs: asStringArray(params.paragraphs),
            moves: asStringArray(params.moves),
          });
          return {
            success: result.success,
            message: result.message,
            data: {
              lesson: result.lesson,
              step: result.step,
              totalSteps: result.totalSteps,
              screen: result.screen,
              recapWritten: result.recapWritten,
              recapExpected: result.recapExpected,
              nextTools: result.nextTools,
            },
          };
        },
      },
      {
        name: 'set-lesson-recap',
        description:
          'Write or replace the Recap screen after the last teaching step. Skip this for one-step lessons such as a chess exam — those have no recap. Recap is not a numbered step. Call this when a multi-step line is complete, or rewrite it after extra add-lesson-step beats. Then how_to_ask_the_user. ' +
          COACH_NOTATION_RULE +
          ' ' +
          WAIT_TURN_RULE,
        inputSchema: {
          type: 'object',
          properties: {
            lesson: {
              type: 'number',
              description: 'Catalog lesson number.',
            },
            title: { type: 'string', description: 'Optional recap heading. Default Recap.' },
            paragraphs: {
              type: 'array',
              items: { type: 'string' },
              description: 'Takeaway after the beats so far. Rewrite freely when the student asked something new.',
            },
            body: {
              type: 'string',
              description: 'Fallback if you cannot send paragraphs.',
            },
          },
          required: ['lesson', 'paragraphs'],
        },
        execute: async (params: Record<string, unknown>): Promise<ToolResponse> => {
          const summary = parseSummaryDraft(
            Array.isArray(params.paragraphs)
              ? { title: params.title, paragraphs: params.paragraphs }
              : params.body || params
          );
          if (!summary) {
            return {
              success: false,
              message: 'Provide recap paragraphs (or body) for set-lesson-recap.',
              data: null,
            };
          }
          const result = actionsRef.current.lessons.applyLessonRecap({
            lesson: asPositiveInt(params.lesson),
            title: summary.title || (typeof params.title === 'string' ? params.title : undefined),
            paragraphs: summary.paragraphs,
          });
          return {
            success: result.success,
            message: result.message,
            data: { lesson: result.lesson, screen: 'recap' },
          };
        },
      },
      {
        name: 'set-coach',
        description:
          'Update the currently visible coach text only. Prefer create-lesson, add-lesson-step, and set-lesson-recap. ' +
          COACH_NOTATION_RULE,
        inputSchema: {
          type: 'object',
          properties: {
            lesson: {
              type: 'number',
              description: 'Catalog lesson number. Reuse it; do not invent a new lesson per move.',
            },
            title: { type: 'string', description: 'Beat heading, not the whole lesson topic.' },
            what: { type: 'string', description: 'What happens now, with English moves.' },
            why: { type: 'string', description: 'Why this belongs here.' },
            paragraphs: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional extra paragraphs after what/why. ' + COACH_NOTATION_RULE,
            },
            body: {
              type: 'string',
              description: 'Fallback only if you cannot send paragraphs. Prefer paragraphs.',
            },
            step: {
              type: 'number',
              description: '1-based teaching step index. Omit to append.',
            },
            totalSteps: { type: 'number' },
          },
          required: ['title', 'lesson'],
        },
        execute: async (params: Record<string, unknown>): Promise<ToolResponse> => {
          const what = typeof params.what === 'string' ? params.what.trim() : '';
          const why = typeof params.why === 'string' ? params.why.trim() : '';
          const extra = asStringArray(params.paragraphs);
          const copy = normalizeCoachCopy({
            body: typeof params.body === 'string' ? params.body : '',
            paragraphs: extra.length ? extra : what || why ? [] : asStringArray(params.paragraphs),
          });
          const result = actionsRef.current.lessons.setCoach({
            title: String(params.title || ''),
            body: copy.body,
            paragraphs: copy.paragraphs,
            what: what || undefined,
            why: why || undefined,
            lesson: asPositiveInt(params.lesson),
            step: asPositiveInt(params.step),
            totalSteps: asPositiveInt(params.totalSteps),
          });
          return {
            success: true,
            message: `Coach panel updated. Lesson ${result.lesson}, step ${result.step} of ${result.totalSteps}. Prefer add-lesson-step then set-lesson-recap.`,
            data: result,
          };
        },
      },
      {
        name: 'annotate-board',
        description: 'Highlight squares and draw arrows on the board. kinds: move, capture, key, wrong, correct. Omit highlights or arrows to leave the current ones in place; pass an empty array to clear that overlay. Square names must be English algebraic (e4, f7), never Hebrew letters.',
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
          const highlights = Array.isArray(params.highlights) ? params.highlights as BoardHighlight[] : undefined;
          const arrows = Array.isArray(params.arrows) ? params.arrows as BoardArrow[] : undefined;
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
        description: 'Load a curated famous game or a saved user-catalog lesson by id or name (scholars-mate, fools-mate, italian-game, opera-game). Sets the starting position. Then call play-line for famous games.',
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
        description: 'Play moves on the board with the hand animation. During a catalog lesson this does NOT change the coach text — use add-lesson-step Play buttons instead. Omit moves to continue a loaded famous game. Then call how_to_ask_the_user.',
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
        description: 'Empty-ish board with one piece, legal-move highlights, and a coach explanation of how that piece moves. Then call how_to_ask_the_user.',
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
        description: 'Show a question in the coach panel and wait until the user clicks a square on the board. Returns whether they clicked a correct square. This tool waits for the click, then times out shortly before the host aborts. After timeout the quiz stays on the board and the student pastes their click in chat — stop and wait. ' + COACH_NOTATION_RULE,
        inputSchema: {
          type: 'object',
          properties: {
            question: {
              type: 'string',
              description: 'Quiz prompt shown to the student. ' + COACH_NOTATION_RULE,
            },
            type: {
              type: 'string',
              enum: ['click-square', 'click-piece', 'choose-move'],
            },
            correct: {
              type: 'array',
              items: { type: 'string' },
              description: 'Acceptable squares such as ["e5", "e4"]',
            },
            hint: {
              type: 'string',
              description: 'Optional hint. ' + COACH_NOTATION_RULE,
            },
          },
          required: ['question', 'correct'],
        },
        execute: async (params: Record<string, unknown>, options?: { signal?: AbortSignal }): Promise<ToolResponse> => {
          const correct = asStringArray(params.correct);
          if (!correct.length) {
            return { success: false, message: 'Provide at least one correct square', data: null };
          }
          const result = await actionsRef.current.lessons.askQuiz({
            question: String(params.question || ''),
            type: (params.type as QuizState['type']) || 'click-square',
            correct,
            hint: typeof params.hint === 'string' ? params.hint : undefined,
          }, options);
          if (result.timedOut) {
            return {
              success: false,
              message:
                'Timed out waiting for a click. The quiz is still on the board. The student will copy their square into chat. Do not call more tools. Stop and wait.',
              data: result,
            };
          }
          return {
            success: result.correct,
            message: result.correct ? `Correct: ${result.square}` : `Clicked ${result.square || '(cancelled)'}`,
            data: result,
          };
        },
      },
      {
        name: 'set-page-background',
        description:
          'Sets the chess page background from an image. WebMCP tool arguments are JSON only — there is no native File transfer — so pass the picture as a data URL or raw base64 in `image`, or an http(s) `url`. If the user attached an image in this chat, encode it as base64/data URL and pass it here. Use clear: true to restore the theme background.',
        inputSchema: {
          type: 'object',
          properties: {
            image: {
              type: 'string',
              description:
                'PNG, JPEG, WebP, GIF, or BMP as a data URL (data:image/png;base64,...) or raw base64. Prefer a data URL.',
            },
            mimeType: {
              type: 'string',
              description: 'Required when image is raw base64. Example: image/png or image/jpeg.',
            },
            url: {
              type: 'string',
              description: 'http(s) URL of an image, used as the page background instead of base64.',
            },
            clear: {
              type: 'boolean',
              description: 'If true, remove the custom background and use the selected board theme again.',
            },
          },
        },
        execute: async (params: Record<string, unknown>): Promise<ToolResponse> => {
          const args = parseBackgroundToolArgs(params);
          if (args.clear) {
            actionsRef.current.setPageBackground(null);
            return {
              success: true,
              message: 'Custom page background cleared.',
              data: { cleared: true },
            };
          }
          const prepared = await preparePageBackground(params);
          if (!prepared.ok) {
            return { success: false, message: prepared.message, data: null };
          }
          const { persisted } = actionsRef.current.setPageBackground(prepared.cssUrl);
          return {
            success: true,
            message: persisted
              ? 'Page background updated from the image.'
              : 'Page background updated for this session, but it was too large to save in the browser.',
            data: { kind: prepared.kind, mimeType: prepared.mimeType || null, persisted },
          };
        },
      },
      {
        name: 'how_to_ask_the_user',
        description:
          'Returns instructions for asking the student in this chat with clickable visualization buttons, not a numbered list and not on the chess page. Takes no arguments. Call this whenever you need them to choose what happens next, then follow the returned prompt exactly and stop. Includes the current board-theme accent and a readable label color. ' +
          WAIT_TURN_RULE,
        inputSchema: { type: 'object', properties: {} },
        execute: async (): Promise<ToolResponse> => {
          const accent = readBoardChatAccent();
          const prompt = buildHowToAskTheUserPrompt(accent, CHAT_BUTTON_TEXT);
          return {
            success: true,
            message: prompt,
            data: { accent, text: CHAT_BUTTON_TEXT },
          };
        },
      },
    ];

    const toolNames = tools.map(t => t.name);
    const longRunning = new Set(["ask-quiz", "play-line"]);
    const wrappedTools = tools.map((tool) => ({
      ...tool,
      execute: async (params: Record<string, unknown>, options?: { signal?: AbortSignal }): Promise<ToolResponse> => {
        const started = Date.now();
        if (longRunning.has(tool.name)) {
          logLessonDebug("tool", tool.name, { phase: "start", params: compactToolParams(params || {}) });
        }
        try {
          const result = await tool.execute(params, options);
          logLessonDebug("tool", tool.name, {
            durationMs: Date.now() - started,
            params: compactToolParams(params || {}),
            ...compactToolResult(result),
          });
          return result;
        } catch (error) {
          logLessonDebug("tool", tool.name, {
            phase: "error",
            durationMs: Date.now() - started,
            params: compactToolParams(params || {}),
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
