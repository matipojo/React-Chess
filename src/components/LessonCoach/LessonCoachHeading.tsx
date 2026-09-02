import { CoachState } from "../../lessons/types";
import { ResetIcon } from "./LessonCoachIcons";
import LessonLinkedText from "./LessonLinkedText";
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
  linkMode,
  knownIds,
}: Props) {
  return (
    <div className="lesson-coach-heading">
      <div className="lesson-coach-heading-text">
        <p className="lesson-coach-kicker">Learn</p>
        {coach?.lessonTitle &&
          coach.phase !== "goal" &&
          coach.phase !== "showme" && (
            <p className="lesson-coach-topic">
              <LessonLinkedText
                text={coach.lessonTitle}
                linkMode={linkMode}
                knownIds={knownIds}
                onHoverSquares={onHoverSquares}
                resolvePeekSquares={resolvePeekSquares}
              />
            </p>
          )}
        {coach && (
          <h2>
            <LessonLinkedText
              text={coach.title}
              linkMode={linkMode}
              knownIds={knownIds}
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
