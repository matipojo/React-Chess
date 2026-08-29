import { CoachState } from "../../lessons/types";
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

  return (
    <aside className="lesson-coach">
      <div className="lesson-coach-handle" aria-hidden="true" />
      <div className="lesson-coach-content">
        <p className="lesson-coach-kicker">Learn</p>
        {coach && (
          <>
            <h2>{coach.title}</h2>
            <p className="lesson-coach-body">{coach.body}</p>
            {coach.step !== undefined && coach.totalSteps !== undefined && (
              <p className="lesson-coach-step">
                Step {coach.step} of {coach.totalSteps}
              </p>
            )}
          </>
        )}
        {quizQuestion && (
          <div className="lesson-coach-quiz">
            <p className="lesson-coach-quiz-label">Your turn</p>
            <p>{quizQuestion}</p>
            {quizHint && <p className="lesson-coach-hint">{quizHint}</p>}
            {quizFeedback && (
              <p className="lesson-coach-feedback">{quizFeedback}</p>
            )}
          </div>
        )}
      </div>
      {(onBack || onNext) && (
        <div className="lesson-coach-nav">
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
