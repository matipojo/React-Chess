export type HighlightKind = "move" | "capture" | "key" | "wrong" | "correct";

export type BoardHighlight = {
  square: string;
  kind: HighlightKind;
};

export type BoardArrow = {
  from: string;
  to: string;
  color?: string;
};

export type CoachState = {
  title: string;
  body: string;
  step?: number;
  totalSteps?: number;
};

export type QuizState = {
  question: string;
  type: "click-square" | "click-piece" | "choose-move";
  correct: string[];
  hint?: string;
};

export type FamousGame = {
  id: string;
  name: string;
  year?: number;
  hook: string;
  moves: string[];
  notes?: { ply: number; text: string }[];
};

export type LoadedLine = {
  id: string;
  name: string;
  moves: string[];
  notes: { ply: number; text: string }[];
  ply: number;
};

export type SavedLessonKind = "game" | "piece" | "custom";

export type SavedLesson = {
  id: string;
  kind: SavedLessonKind;
  title: string;
  body: string;
  savedAt: number;
  gameId?: string;
  moves?: string[];
  notes?: { ply: number; text: string }[];
  piece?: string;
  square?: string;
  color?: string;
  fen?: string;
  highlights?: BoardHighlight[];
  arrows?: BoardArrow[];
  quiz?: QuizState;
  ply?: number;
};
