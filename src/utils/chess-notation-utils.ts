export function coordinatesToNotation(x: number, y: number): string {
  return `${String.fromCharCode("a".charCodeAt(0) + x)}${y + 1}`;
}

export function chessNotationToCoordinates(notation: string): { x: number; y: number } {
  if (!/^[a-h][1-8]$/.test(notation)) {
    throw new Error(`Invalid chess notation: ${notation}. Expected format like 'e4', 'a1', etc.`);
  }

  const file = notation.charAt(0);
  const rank = parseInt(notation.charAt(1));

  return {
    x: file.charCodeAt(0) - 'a'.charCodeAt(0),
    y: rank - 1,
  };
}

export function parseMoveNotation(moveNotation: string): { from: string; to: string } {
  const [fromNotation, toNotation] = moveNotation.split(':');

  if (!fromNotation || !toNotation) {
    throw new Error(`Invalid move format: ${moveNotation}. Expected format: "from:to" (e.g., "e2:e4")`);
  }

  return { from: fromNotation, to: toNotation };
}
