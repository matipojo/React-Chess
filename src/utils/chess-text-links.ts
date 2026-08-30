export type ChessTextPart =
  | { type: "text"; value: string }
  | { type: "ref"; value: string; squares: string[] };

const CHESS_REF =
  /O-O-O|O-O|[a-h][1-8]\s*[-:x–—→]\s*[a-h][1-8]|[a-h][1-8][a-h][1-8]|[NBRQK][a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQ])?[+#]?|[a-h]x[a-h][1-8](?:=[NBRQ])?[+#]?|[a-h][1-8](?:=[NBRQ])?[+#]?/g;

function isAsciiWordChar(ch: string | undefined): boolean {
  return !!ch && /[A-Za-z0-9]/.test(ch);
}

export function squaresFromChessRef(raw: string): string[] {
  const compact = raw.replace(/\s/g, "");
  if (/^O-O-O/.test(compact)) {
    return ["e1", "c1", "a1", "e8", "c8", "a8"];
  }
  if (/^O-O/.test(compact)) {
    return ["e1", "g1", "h1", "e8", "g8", "h8"];
  }
  const found = compact.toLowerCase().match(/[a-h][1-8]/g) || [];
  const unique: string[] = [];
  for (let i = 0; i < found.length; i++) {
    if (unique.indexOf(found[i]) === -1) {
      unique.push(found[i]);
    }
  }
  return unique;
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
    parts.push({
      type: "ref",
      value,
      squares: squaresFromChessRef(value),
    });
    lastIndex = end;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  return parts;
}

export type ChessDisplayPart =
  | { type: "text"; value: string }
  | { type: "ltr"; parts: ChessTextPart[] };

const RTL_SCRIPT = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;

export function splitLtrPrefix(
  text: string
): { prefix: string; rest: string } {
  if (!RTL_SCRIPT.test(text)) {
    return { prefix: text, rest: "" };
  }
  const match = text.match(/^[0-9A-Za-z.,:;!?…'"“”\-–—+#/=*\s]+/);
  if (!match) {
    return { prefix: "", rest: text };
  }
  return { prefix: match[0], rest: text.slice(match[0].length) };
}

/** Keep Latin chess notation as one LTR unit so it does not scramble RTL wrapping. */
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
    const { prefix, rest } = splitLtrPrefix(part.value);
    if (prefix) {
      ltrParts.push({ type: "text", value: prefix });
    }
    if (rest) {
      flushLtr();
      grouped.push({ type: "text", value: rest });
    }
  }
  flushLtr();
  return grouped;
}
