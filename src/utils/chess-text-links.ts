import { PieceType } from "../Types";

export type ChessRefPart = {
  type: "ref";
  value: string;
  squares: string[];
  piece?: PieceType;
  dest?: string;
  fromFile?: string;
  fromRank?: string;
};

export type ChessTextPart =
  | { type: "text"; value: string }
  | ChessRefPart;

export type PeekPiece = {
  type: string;
  square: string;
  destinations: string[];
};

const CHESS_REF =
  /O-O-O|O-O|[a-h][1-8]\s*[-:x–—→]\s*[a-h][1-8]|[a-h][1-8][a-h][1-8]|[NBRQK][a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQ])?[+#]?[!?]*|[a-h]x[a-h][1-8](?:=[NBRQ])?[+#]?[!?]*|[a-h][1-8](?:=[NBRQ])?[+#]?[!?]*/g;

const LETTER_TO_PIECE: { [letter: string]: PieceType } = {
  N: PieceType.KNIGHT,
  B: PieceType.BISHOP,
  R: PieceType.ROOK,
  Q: PieceType.QUEEN,
  K: PieceType.KING,
};

function isAsciiWordChar(ch: string | undefined): boolean {
  return !!ch && /[A-Za-z0-9]/.test(ch);
}

function uniqueSquares(squares: string[]): string[] {
  const unique: string[] = [];
  for (let i = 0; i < squares.length; i++) {
    if (unique.indexOf(squares[i]) === -1) {
      unique.push(squares[i]);
    }
  }
  return unique;
}

export function parseChessRef(raw: string): Omit<ChessRefPart, "type" | "value"> {
  const compact = raw.replace(/\s/g, "").replace(/[!?]+$/g, "");
  if (/^O-O-O/.test(compact)) {
    return { squares: ["e1", "c1", "a1", "e8", "c8", "a8"], piece: PieceType.KING };
  }
  if (/^O-O/.test(compact)) {
    return { squares: ["e1", "g1", "h1", "e8", "g8", "h8"], piece: PieceType.KING };
  }

  const coord = compact.match(/^([a-h][1-8])[-:x–—→]([a-h][1-8])/i);
  if (coord) {
    return {
      squares: [coord[1].toLowerCase(), coord[2].toLowerCase()],
      dest: coord[2].toLowerCase(),
    };
  }

  const compactMove = compact.match(/^([a-h][1-8])([a-h][1-8])$/i);
  if (compactMove) {
    return {
      squares: [compactMove[1].toLowerCase(), compactMove[2].toLowerCase()],
      dest: compactMove[2].toLowerCase(),
    };
  }

  const san = compact.match(
    /^([NBRQK])([a-h])?([1-8])?(x)?([a-h][1-8])(?:=[NBRQ])?[+#]?$/
  );
  if (san) {
    const dest = san[5].toLowerCase();
    return {
      squares: [dest],
      dest,
      piece: LETTER_TO_PIECE[san[1]],
      fromFile: san[2] ? san[2].toLowerCase() : undefined,
      fromRank: san[3],
    };
  }

  const pawnCapture = compact.match(/^([a-h])x([a-h][1-8])(?:=[NBRQ])?[+#]?$/i);
  if (pawnCapture) {
    const dest = pawnCapture[2].toLowerCase();
    return {
      squares: [dest],
      dest,
      piece: PieceType.PAWN,
      fromFile: pawnCapture[1].toLowerCase(),
    };
  }

  const pawn = compact.match(/^([a-h][1-8])(?:=[NBRQ])?[+#]?$/i);
  if (pawn) {
    const dest = pawn[1].toLowerCase();
    return { squares: [dest], dest };
  }

  const found = compact.toLowerCase().match(/[a-h][1-8]/g) || [];
  return { squares: uniqueSquares(found) };
}

export function squaresFromChessRef(raw: string): string[] {
  return parseChessRef(raw).squares;
}

export function peekSquaresFromRef(
  ref: ChessRefPart,
  pieces: PeekPiece[]
): string[] {
  if (!ref.piece || !ref.dest) {
    return ref.squares;
  }

  const dest = ref.dest;
  const matching = pieces.filter((piece) => {
    if (piece.type !== ref.piece) {
      return false;
    }
    if (ref.fromFile && piece.square[0] !== ref.fromFile) {
      return false;
    }
    if (ref.fromRank && piece.square[1] !== ref.fromRank) {
      return false;
    }
    return true;
  });

  const canReach = matching.filter(
    (piece) => piece.destinations.indexOf(dest) !== -1
  );
  const onDest = matching.filter((piece) => piece.square === dest);

  let origins = canReach;
  if (origins.length === 0 && onDest.length === 0) {
    const elsewhere = matching.filter((piece) => piece.square !== dest);
    if (elsewhere.length === 1) {
      origins = elsewhere;
    }
  }

  const squares: string[] = [];
  for (let i = 0; i < origins.length; i++) {
    if (origins[i].square !== dest) {
      squares.push(origins[i].square);
    }
  }
  squares.push(dest);
  return uniqueSquares(squares);
}

/** Real newlines and literal "\\n" from model JSON both become separate lines. */
export function splitTextLines(text: string): string[] {
  return text.replace(/\\n/g, "\n").split(/\r?\n/);
}

export function tokenizeChessText(text: string): ChessTextPart[] {
  if (!text) {
    return [];
  }

  const parts: ChessTextPart[] = [];
  const pattern = new RegExp(CHESS_REF.source, "g");
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const start = match.index;
    const value = match[0];
    const end = start + value.length;
    const before = text[start - 1];
    const after = text[end];

    if (isAsciiWordChar(before) || isAsciiWordChar(after)) {
      continue;
    }

    if (start > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, start) });
    }
    const parsed = parseChessRef(value);
    parts.push({
      type: "ref",
      value,
      squares: parsed.squares,
      piece: parsed.piece,
      dest: parsed.dest,
      fromFile: parsed.fromFile,
      fromRank: parsed.fromRank,
    });
    lastIndex = end;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  return attachMoveNumbers(parts);
}

/** Fold "3..." / "4." into the following SAN so the number cannot separate in RTL. */
export function attachMoveNumbers(parts: ChessTextPart[]): ChessTextPart[] {
  const result: ChessTextPart[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const next = parts[i + 1];
    if (part.type === "text" && next && next.type === "ref") {
      const matched = part.value.match(/^(.*?)(\d+\.{1,3}|\.{2,3})\s*$/);
      if (matched) {
        if (matched[1]) {
          result.push({ type: "text", value: matched[1] });
        }
        result.push({
          ...next,
          value: matched[2] + next.value,
        });
        i += 1;
        continue;
      }
    }
    result.push(part);
  }
  return result;
}

export type ChessDisplayPart =
  | { type: "text"; value: string }
  | { type: "ltr"; parts: ChessTextPart[] };

const RTL_SCRIPT = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;

export function isRtlScript(text: string): boolean {
  return RTL_SCRIPT.test(text);
}

/** Spaces and punctuation between moves, not English or RTL words. */
function isLtrGlue(text: string): boolean {
  return !/[A-Za-z]{2,}/.test(text) && !isRtlScript(text);
}

/** Keep adjacent Latin moves together, but never swallow RTL or English prose into an LTR run. */
export function groupLtrRuns(parts: ChessTextPart[]): ChessDisplayPart[] {
  const grouped: ChessDisplayPart[] = [];
  let ltrParts: ChessTextPart[] = [];

  const flushLtr = () => {
    if (ltrParts.length === 0) {
      return;
    }
    grouped.push({ type: "ltr", parts: ltrParts });
    ltrParts = [];
  };

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.type === "ref") {
      ltrParts.push(part);
      continue;
    }
    if (isRtlScript(part.value)) {
      flushLtr();
      grouped.push({ type: "text", value: part.value });
      continue;
    }
    if (isLtrGlue(part.value)) {
      ltrParts.push(part);
      continue;
    }
    flushLtr();
    grouped.push({ type: "text", value: part.value });
  }
  flushLtr();
  return grouped;
}
