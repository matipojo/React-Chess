import { copyPlainText } from "./waitForUser";

export const QUIZ_TIMEOUT_MS = 30000;
export const QUIZ_TIMEOUT_SECONDS = 30;

export type QuizCopyPayload = {
  question: string;
  square: string;
  correct: boolean;
};

export function formatQuizCorrectFeedback(): string {
  return "Correct!";
}

export function formatQuizSquares(correct: string[]): string {
  return correct.map((item) => item.toLowerCase()).join(", ");
}

export function normalizeQuizToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s/g, "");
}

export function isBoardSquare(value: string): boolean {
  return /^[a-h][1-8]$/.test(normalizeQuizToken(value));
}

export function quizAnswerIsCorrect(
  correct: string[],
  square: string,
  from?: string
): boolean {
  const dest = normalizeQuizToken(square);
  if (!isBoardSquare(dest)) {
    return false;
  }
  const origin = from ? normalizeQuizToken(from) : "";
  for (let i = 0; i < correct.length; i++) {
    const token = normalizeQuizToken(correct[i]);
    if (!token) {
      continue;
    }
    if (token === dest) {
      return true;
    }
    const move = token.match(/^([a-h][1-8])[-:x]?([a-h][1-8])$/);
    if (move && move[2] === dest && (!origin || origin === move[1])) {
      return true;
    }
    const squares = token.match(/[a-h][1-8]/g);
    if (squares && squares[squares.length - 1] === dest) {
      return true;
    }
  }
  return false;
}

export function formatQuizIncorrectFeedback(correct: string[]): string {
  const squares = formatQuizSquares(correct);
  if (correct.length === 1) {
    return `Not quite.\nThe correct square is ${squares}.`;
  }
  return `Not quite.\nThe correct squares are ${squares}.`;
}

export function formatQuizTimeoutFeedback(correct: string[]): string {
  const squares = formatQuizSquares(correct);
  if (correct.length === 1) {
    return `Time's up.\nThe correct square is ${squares}.`;
  }
  return `Time's up.\nThe correct squares are ${squares}.`;
}

export function formatFigureQuizTokens(correct: string[]): string {
  return correct.map((item) => item.trim()).filter(Boolean).join(", ");
}

function figureQuizNoun(correct: string[]): { singular: string; plural: string } {
  const kinds = correct.map((item) => {
    const token = item.trim();
    if (token.startsWith("∠")) {
      return "angle";
    }
    if (token.startsWith("△")) {
      return "triangle";
    }
    if (/^g\(△?[A-Z]{3}\)$/i.test(token) || token === "G") {
      return "point";
    }
    if (/^[A-Z](?:'[A-Z]*)?$/.test(token) || /^[A-Z]\d+$/.test(token)) {
      return "point";
    }
    if (/^[A-Z]{2}$/.test(token)) {
      return "side";
    }
    return "object";
  });
  const first = kinds[0] || "object";
  if (kinds.length && kinds.every((kind) => kind === first)) {
    return {
      singular: first,
      plural: first === "side" ? "sides" : first + "s",
    };
  }
  return { singular: "object", plural: "objects" };
}

export function formatFigureQuizIncorrectFeedback(correct: string[]): string {
  const objects = formatFigureQuizTokens(correct);
  const noun = figureQuizNoun(correct);
  if (correct.length === 1) {
    return `Not quite.\nThe correct ${noun.singular} is ${objects}.`;
  }
  return `Not quite.\nThe correct ${noun.plural} are ${objects}.`;
}

export function formatFigureQuizTimeoutFeedback(correct: string[]): string {
  const objects = formatFigureQuizTokens(correct);
  const noun = figureQuizNoun(correct);
  if (correct.length === 1) {
    return `Time's up.\nThe correct ${noun.singular} is ${objects}.`;
  }
  return `Time's up.\nThe correct ${noun.plural} are ${objects}.`;
}

export function formatQuizClickCopy(payload: QuizCopyPayload): string {
  return [
    "The student answered an ask-quiz by clicking a square. Continue from this click.",
    `Q: ${payload.question}`,
    `square: ${payload.square}`,
    `correct: ${payload.correct ? "yes" : "no"}`,
  ].join("\n");
}

export async function copyQuizClick(payload: QuizCopyPayload): Promise<boolean> {
  return copyPlainText(formatQuizClickCopy(payload));
}
