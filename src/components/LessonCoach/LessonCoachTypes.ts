import { CoachState, WaitChoice } from "../../lessons/types";
import { CoachPlayMove } from "../../lessons/stepPlay";
import { ShowMePlayback } from "../../lessons/showMe";
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

export type LessonCoachShowMeProps = {
  onPlayLine?: () => void;
  onPauseLine?: () => void;
  onStopLine?: () => void;
  onReplayLine?: () => void;
  showmePlayback?: ShowMePlayback;
  showmePly?: number;
};

export type LessonCoachProps = LessonCoachLinkProps &
  LessonCoachPlayProps &
  LessonCoachShowMeProps & {
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
