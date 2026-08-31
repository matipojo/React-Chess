import { Board } from "../models/Board";
import { boardToFen } from "../utils/board-setup";
import { BoardArrow, BoardHighlight } from "./types";

const PEEK_ARROW_COLOR = "#81d4fa";

export function fenForDebug(board: Board): string {
  return boardToFen(board);
}

export function compactArrows(arrows: BoardArrow[]) {
  return arrows.map((arrow) => ({
    from: arrow.from,
    to: arrow.to,
    color: arrow.color || "#ffc107",
  }));
}

export function overlaySnapshot(args: {
  highlights: BoardHighlight[];
  arrows: BoardArrow[];
  coachTitle?: string | null;
}) {
  return {
    highlights: args.highlights.map((item) => ({ kind: item.kind, square: item.square })),
    arrows: compactArrows(args.arrows),
    coachTitle: args.coachTitle || null,
  };
}

export function lessonArrowsForPaintLog(arrows: BoardArrow[]) {
  return arrows.filter((arrow) => arrow.color !== PEEK_ARROW_COLOR);
}

export function paintFingerprint(arrows: BoardArrow[]): string {
  return lessonArrowsForPaintLog(arrows)
    .map((arrow) => `${arrow.from}:${arrow.to}:${arrow.color || ""}`)
    .join("|");
}

export function compactPaintDetail(args: {
  arrows: BoardArrow[];
  tileSizePx: number;
  boardOffsetVsSvg: { dx: number; dy: number; dw: number; dh: number } | null;
}) {
  const lessonArrows = lessonArrowsForPaintLog(args.arrows);
  const offset = args.boardOffsetVsSvg;
  const misaligned = !!(
    offset &&
    (Math.abs(offset.dx) > 4 ||
      Math.abs(offset.dy) > 4 ||
      Math.abs(offset.dw) > 4 ||
      Math.abs(offset.dh) > 4)
  );
  return {
    arrowCount: lessonArrows.length,
    arrows: compactArrows(lessonArrows),
    tileSizePx: Math.round(args.tileSizePx * 10) / 10,
    ...(misaligned && offset ? { misaligned: true as const, boardOffsetVsSvg: offset } : {}),
  };
}

export function compactToolResult(result: {
  success: boolean;
  message: string;
  data: unknown;
}): Record<string, unknown> {
  return {
    success: result.success,
    message: result.message,
    data: compactLoggedValue(result.data),
  };
}

function compactLoggedValue(value: unknown): unknown {
  if (typeof value === "string" && (value.startsWith("data:image") || value.length > 400)) {
    return { omitted: "long-string", length: value.length };
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 0 && isPieceDump(value[0])) {
      return { omitted: "pieces", count: value.length };
    }
    return value.map(compactLoggedValue);
  }
  const record = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  for (const key of Object.keys(record)) {
    if (key === "pieces" && Array.isArray(record.pieces)) {
      next.pieceCount = record.pieces.length;
      continue;
    }
    if (key === "possibleMoves") {
      continue;
    }
    next[key] = compactLoggedValue(record[key]);
  }
  return next;
}

function isPieceDump(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  const item = value as Record<string, unknown>;
  return typeof item.type === "string" && ("position" in item || "square" in item || "x" in item);
}
