import { CoachState } from "../../lessons/types";
import { detectTextDirection } from "../../utils/text-direction";
import ChessLinkedText from "./ChessLinkedText";
import "./LessonCoach.css";

type Props = {
  coach: CoachState | null;
  quizQuestion?: string;
  quizHint?: string;
  quizFeedback?: string;
  onBack?: () => void;
  onNext?: () => void;
  canBack?: boolean;
  canNext?: boolean;
};

export default function LessonCoach({
  coach,
  quizQuestion,
  quizHint,
  quizFeedback,
  onBack,
  onNext,
  canBack,
  canNext,
}: Props) {
  if (!coach && !quizQuestion) {
    return (
      <aside className="lesson-coach">
        <div className="lesson-coach-handle" aria-hidden="true" />
        <div className="lesson-coach-content">
          <p className="lesson-coach-kicker">Learn</p>
          <h2>Ask the assistant</h2>
          <p>
            Try: “how does a knight move?”, “show Scholar’s Mate”, or “quiz me
            on forks.”
          </p>
        </div>
      </aside>
    );
  }

  const { dir, lang } = detectTextDirection(
    [coach?.title, coach?.body, quizQuestion, quizHint, quizFeedback]
      .filter(Boolean)
      .join("\n")
  );

  return (
    <aside className="lesson-coach" dir={dir} lang={lang}>
      <div className="lesson-coach-handle" aria-hidden="true" />
      <div className="lesson-coach-content">
        <p className="lesson-coach-kicker">Learn</p>
        {coach && (
          <>
            <h2>
              <ChessLinkedText text={coach.title} />
            </h2>
            <p className="lesson-coach-body">
              <ChessLinkedText text={coach.body} />
            </p>
            {coach.step !== undefined && coach.totalSteps !== undefined && (
              <p className="lesson-coach-step">
                <span dir="ltr">
                  Step {coach.step} of {coach.totalSteps}
                </span>
              </p>
            )}
          </>
        )}
        {quizQuestion && (
          <div className="lesson-coach-quiz">
            <p className="lesson-coach-quiz-label">Your turn</p>
            <p>
              <ChessLinkedText text={quizQuestion} />
            </p>
            {quizHint && (
              <p className="lesson-coach-hint">
                <ChessLinkedText text={quizHint} />
              </p>
            )}
            {quizFeedback && (
              <p className="lesson-coach-feedback">
                <ChessLinkedText text={quizFeedback} />
              </p>
            )}
          </div>
        )}
      </div>
      {(onBack || onNext) && (
        <div className="lesson-coach-nav" dir="ltr">
          <button type="button" onClick={onBack} disabled={!canBack}>
            Back
          </button>
          <button type="button" onClick={onNext} disabled={!canNext}>
            Next
          </button>
        </div>
      )}
    </aside>
  );
}
