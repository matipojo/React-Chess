/** Shared WebMCP instruction: squares in coach text must stay Latin so they link and highlight. */
export const COACH_NOTATION_RULE =
  'Squares and moves MUST be English algebraic only: files a–h and ranks 1–8. Write e4, h5, g4, e2:e4, Nf3, Qh5, Bc4. Never write squares with non-Latin letters. Words may be in any language, but the square itself must stay Latin — e.g. "the queen to h5", "the bishop to c4".';

/** Shared WebMCP instruction: ask the student in the host chat, not on the page. */
export const WAIT_TURN_RULE =
  'After anything the student should see on the board (coach text, a played line, a demo), call how_to_ask_the_user with no arguments, then follow the returned instructions: render clickable buttons in this chat with your visualization UI. Do not use a numbered list. Do not put the question on the webpage. For a puzzle or exam, call how_to_offer_a_hint, then add-lesson-step with type riddle (question + correct squares). The riddle prompt must not spoil how to solve; the student taps Give me a hint in this chat if they want a nudge.';
