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
    return `Not quite. The correct square is ${squares}.`;
  }
  return `Not quite. The correct squares are ${squares}.`;
}

export function formatQuizTimeoutFeedback(correct: string[]): string {
  const squares = formatQuizSquares(correct);
  if (correct.length === 1) {
    return `Time's up. The correct square is ${squares}.`;
  }
  return `Time's up. The correct squares are ${squares}.`;
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
