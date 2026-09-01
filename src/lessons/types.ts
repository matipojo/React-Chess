export type HighlightKind =
  | "move"
  | "capture"
  | "key"
  | "wrong"
  | "correct"
  | "peek";

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
  lessonTitle?: string;
  body: string;
  paragraphs?: string[];
  what?: string;
  why?: string;
  lesson?: number;
  step?: number;
  totalSteps?: number;
  phase?: "goal" | "step" | "riddle" | "recap";
  moves?: string[];
  fromFen?: string;
};

export type QuizState = {
  question: string;
  type: "click-square" | "click-piece" | "choose-move";
  correct: string[];
  hint?: string;
  timedOut?: boolean;
  answered?: boolean;
};

export type QuizResult = {
  correct: boolean;
  square: string;
  timedOut?: boolean;
};

export type WaitChoice = {
  id: string;
  label: string;
};

export type WaitForUserState = {
  prompt: string;
  choices: WaitChoice[];
  timedOut?: boolean;
};

export type WaitForUserResult = {
  action: string;
  source: "choice" | "catalog" | "cancelled" | "timeout";
  label?: string;
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

export type SavedLessonStep = {
  title: string;
  body: string;
  paragraphs?: string[];
  what?: string;
  why?: string;
  kind?: "step" | "riddle" | "recap" | "summary";
  moves?: string[];
  fen?: string;
  tfn?: string;
  highlights?: BoardHighlight[];
  arrows?: BoardArrow[];
  quiz?: QuizState;
  ply?: number;
};

export type LessonRecap = {
  title?: string;
  body?: string;
  paragraphs: string[];
};

export type SavedLesson = {
  id: string;
  kind: SavedLessonKind;
  title: string;
  body: string;
  savedAt: number;
  number?: number;
  steps?: SavedLessonStep[];
  recap?: LessonRecap;
  /** @deprecated Playhead belongs on the learner session, not the catalog. */
  activeStep?: number;
  paragraphs?: string[];
  gameId?: string;
  moves?: string[];
  notes?: { ply: number; text: string }[];
  piece?: string;
  square?: string;
  color?: string;
  fen?: string;
  tfn?: string;
  highlights?: BoardHighlight[];
  arrows?: BoardArrow[];
  quiz?: QuizState;
  ply?: number;
};
