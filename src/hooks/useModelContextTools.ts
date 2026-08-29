import { useEffect, useRef } from 'react';
import { Board } from '../models/Board';
import { Piece } from '../models/Piece';
import { Position } from '../models/Position';
import { PieceType } from '../Types';
import { chessNotationToCoordinates, parseMoveNotation } from '../utils/chess-notation-utils';
import { getModelContext } from '../model-context-types';

type ToolResponse = {
  success: boolean;
  message: string;
  data: unknown;
};

type ChessActions = {
  board: Board;
  playMove: (piece: Piece, destination: Position) => boolean;
  restartGame: () => void;
  promotePawn: (pieceType: PieceType) => void;
  animateMove?: (from: Position, to: Position, team: 'w' | 'b', onComplete?: () => void) => void;
};

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
        description: 'Retrieves the current state of the chess board including piece positions, current turn, total moves, and game status.',
        inputSchema: { type: 'object', properties: {} },
        execute: async (): Promise<ToolResponse> => {
          const { board } = actionsRef.current;
          return {
            success: true,
            message: 'Board state retrieved successfully',
            data: {
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
        description: 'Makes a chess move. Provide the move as "from:to" (e.g., "e2:e4").',
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
          const { board, playMove, animateMove } = actionsRef.current;
          try {
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
              const success = playMove(piece, to);
              return {
                success,
                message: success ? `Moved ${piece.type} from ${fromNotation} to ${toNotation}` : `Invalid move ${fromNotation} to ${toNotation}`,
                data: { from: fromNotation, to: toNotation, piece: piece.type, team: piece.team },
              };
            };

            if (animateMove) {
              return new Promise<ToolResponse>((resolve) => {
                animateMove(from, to, piece.team as 'w' | 'b', () => {
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
        description: 'Gets all legal moves for a piece at a position (x: 0-7, y: 0-7).',
        inputSchema: {
          type: 'object',
          properties: {
            position: {
              type: 'object',
              properties: {
                x: { type: 'number', minimum: 0, maximum: 7, description: 'X coordinate (0=a, 7=h)' },
                y: { type: 'number', minimum: 0, maximum: 7, description: 'Y coordinate (0=rank 1, 7=rank 8)' },
              },
              required: ['x', 'y'],
            },
          },
          required: ['position'],
        },
        execute: async (params: Record<string, unknown>): Promise<ToolResponse> => {
          const { board } = actionsRef.current;
          const pos = params.position as { x: number; y: number };
          const position = new Position(pos.x, pos.y);
          const piece = board.pieces.find(p => p.samePosition(position));

          if (!piece) {
            return { success: false, message: `No piece at (${pos.x}, ${pos.y})`, data: { possibleMoves: [] } };
          }

          const possibleMoves = piece.possibleMoves?.map(m => ({ x: m.x, y: m.y })) || [];
          return {
            success: true,
            message: `${possibleMoves.length} moves for ${piece.type} at (${pos.x}, ${pos.y})`,
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
    ];

    const toolNames = tools.map(t => t.name);
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
      mc.provideContext({ tools });
    } else if (typeof mc.registerTool === 'function') {
      for (const tool of tools) {
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
