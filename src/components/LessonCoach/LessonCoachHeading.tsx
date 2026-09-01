import { CoachState } from "../../lessons/types";
import ChessLinkedText from "./ChessLinkedText";
import { ResetIcon } from "./LessonCoachIcons";
import { LessonCoachLinkProps } from "./LessonCoachTypes";

type Props = LessonCoachLinkProps & {
  coach?: CoachState | null;
  onReset?: () => void;
  canReset?: boolean;
};

export default function LessonCoachHeading({
  coach,
  onReset,
  canReset,
  onHoverSquares,
  resolvePeekSquares,
}: Props) {
  return (
    <div className="lesson-coach-heading">
      <div className="lesson-coach-heading-text">
        <p className="lesson-coach-kicker">Learn</p>
        {coach?.lessonTitle &&
          coach.phase !== "goal" &&
          coach.phase !== "showme" && (
            <p className="lesson-coach-topic">
              <ChessLinkedText
                text={coach.lessonTitle}
                onHoverSquares={onHoverSquares}
                resolvePeekSquares={resolvePeekSquares}
              />
            </p>
          )}
        {coach && (
          <h2>
            <ChessLinkedText
              text={coach.title}
              onHoverSquares={onHoverSquares}
              resolvePeekSquares={resolvePeekSquares}
            />
          </h2>
        )}
      </div>
      {onReset && (
        <button
          type="button"
          className="lesson-coach-reset"
          aria-label="Reset lesson"
          title="Reset lesson"
          onClick={onReset}
          disabled={!canReset}
        >
          <ResetIcon />
        </button>
      )}
    </div>
  );
}
