import { sanMovesNeedingFromTo } from "../utils/chess-text-links";

/** Shared WebMCP instruction: squares stay Latin; moves use long algebraic notation. */
export const COACH_NOTATION_RULE =
  'Squares MUST be English algebraic: files a–h and ranks 1–8 (e4, f7, h5). Never transliterate squares. Words may be any language. Moves MUST use long algebraic notation (LAN) so hover can draw the arrow from the exact piece: e2-e4, e7-e5, Ng1-f3, Nb8-c6, Bf1-c4. Captures: e4xd5, Bf1xc4. Never write short SAN for a move (not 1.e4, not e5, not Nf3, not Bc4, not Qh5). That only highlights the destination, as if the piece is unknown. Bare squares (e4, f7) name a location, not a move. Castling may stay O-O / O-O-O.';

const FROM_TO_MOVE = /^[a-h][1-8]:[a-h][1-8]$/i;

/** Shared WebMCP instruction: ask the student in the host chat, not on the page. */
export const WAIT_TURN_RULE =
  'After anything the student should see on the board (coach text, a played line, a demo), call how_to_ask_the_user with no arguments, then follow the returned instructions: render clickable buttons in this chat with your visualization UI. Do not use a numbered list. Do not put the question on the webpage. For a puzzle or exam, call how_to_offer_a_hint, then add-lesson-step with type riddle (question + correct squares). The riddle prompt must not spoil how to solve; the student taps Give me a hint in this chat if they want a nudge.';

export function coachNotationViolation(
  texts: Array<string | undefined | null>,
  listedMoves?: string[]
): string | null {
  const found: string[] = [];
  texts.forEach((text) => {
    if (!text) {
      return;
    }
    sanMovesNeedingFromTo(text).forEach((value) => {
      if (found.indexOf(value) === -1) {
        found.push(value);
      }
    });
  });
  (listedMoves || []).forEach((move) => {
    const trimmed = move.trim();
    if (trimmed && !FROM_TO_MOVE.test(trimmed) && found.indexOf(trimmed) === -1) {
      found.push(trimmed);
    }
  });
  if (!found.length) {
    return null;
  }
  return (
    `Moves must use long algebraic notation so hover can draw the arrow from the exact piece (e2-e4, Ng1-f3, Bf1-c4). ` +
    `Do not write short SAN (${found.join(", ")}). Bare squares like f7 only name a location.`
  );
}
