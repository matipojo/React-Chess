import ChessLinkedText from "./ChessLinkedText";
import { LessonCoachLinkProps } from "./LessonCoachTypes";

type Props = LessonCoachLinkProps & {
  quizQuestion: string;
  quizFeedback?: string;
  quizSecondsLeft?: number | null;
};

export default function LessonCoachQuiz({
  quizQuestion,
  quizFeedback,
  quizSecondsLeft,
  onHoverSquares,
  resolvePeekSquares,
}: Props) {
  return (
    <div className="lesson-coach-quiz">
      <div className="lesson-coach-quiz-head">
        <p className="lesson-coach-quiz-label">Your turn</p>
        {typeof quizSecondsLeft === "number" && (
          <p className="lesson-coach-quiz-timer" dir="ltr">
            {quizSecondsLeft}s
          </p>
        )}
      </div>
      <p>
        <ChessLinkedText
          text={quizQuestion}
          onHoverSquares={onHoverSquares}
          resolvePeekSquares={resolvePeekSquares}
        />
      </p>
      {quizFeedback && (
        <p className="lesson-coach-feedback">
          <ChessLinkedText
            text={quizFeedback}
            onHoverSquares={onHoverSquares}
            resolvePeekSquares={resolvePeekSquares}
          />
        </p>
      )}
    </div>
  );
}
