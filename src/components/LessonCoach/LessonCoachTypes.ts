import { CoachState, WaitChoice } from "../../lessons/types";
import { CoachPlayMove } from "../../lessons/stepPlay";
import { ChessRefPart } from "../../utils/chess-text-links";

export type LessonCoachLinkProps = {
  onHoverSquares?: (squares: string[]) => void;
  resolvePeekSquares?: (ref: ChessRefPart) => string[];
};

export type LessonCoachPlayProps = {
  playMoves?: CoachPlayMove[];
  onPlayMove?: (notation: string) => void;
  playBusy?: boolean;
};

export type LessonCoachProps = LessonCoachLinkProps &
  LessonCoachPlayProps & {
    coach: CoachState | null;
    quizQuestion?: string;
    quizFeedback?: string;
    quizSecondsLeft?: number | null;
    waitPrompt?: string;
    waitChoices?: WaitChoice[];
    waitTimedOut?: boolean;
    onWaitChoice?: (action: string, label: string) => void;
    onBack?: () => void;
    onNext?: () => void;
    onFirst?: () => void;
    onLast?: () => void;
    onReset?: () => void;
    onFinish?: () => void;
    canBack?: boolean;
    canNext?: boolean;
    canFirst?: boolean;
    canLast?: boolean;
    canReset?: boolean;
    nextGenerating?: boolean;
    historyIndex?: number;
    historyLength?: number;
  };
