import { useState } from "react";
import { CoachState, WaitChoice } from "../../lessons/types";
import { normalizeCoachCopy } from "../../lessons/coachParagraphs";
import { copyWaitChoice } from "../../lessons/waitForUser";
import { detectTextDirection } from "../../utils/text-direction";
import ChessLinkedText from "./ChessLinkedText";
import { ChessRefPart } from "../../utils/chess-text-links";
import "./LessonCoach.css";

type Props = {
  coach: CoachState | null;
  quizQuestion?: string;
  quizHint?: string;
  quizFeedback?: string;
  waitPrompt?: string;
  waitChoices?: WaitChoice[];
  waitTimedOut?: boolean;
  onWaitChoice?: (action: string, label: string) => void;
  onHoverSquares?: (squares: string[]) => void;
  resolvePeekSquares?: (ref: ChessRefPart) => string[];
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
  waitPrompt,
  waitChoices,
  waitTimedOut,
  onWaitChoice,
  onHoverSquares,
  resolvePeekSquares,
  onBack,
  onNext,
  canBack,
  canNext,
}: Props) {
  const [copiedId, setCopiedId] = useState<string>("");
  const waiting = Boolean(waitPrompt && waitChoices && waitChoices.length > 0);

  if (!coach && !quizQuestion && !waiting) {
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

  const paragraphs = coach
    ? normalizeCoachCopy({
        body: coach.body,
        paragraphs: coach.paragraphs,
      }).paragraphs
    : [];

  const { dir, lang } = detectTextDirection(
    [
      coach?.title,
      ...paragraphs,
      quizQuestion,
      quizHint,
      quizFeedback,
      waitPrompt,
      ...(waitChoices || []).map((choice) => choice.label),
    ]
      .filter(Boolean)
      .join("\n")
  );

  async function copyChoice(choice: WaitChoice) {
    const ok = await copyWaitChoice(waitPrompt || "", choice);
    if (ok) {
      setCopiedId(choice.id);
      window.setTimeout(() => {
        setCopiedId((current) => (current === choice.id ? "" : current));
      }, 1500);
    }
  }

  return (
    <aside className="lesson-coach" dir={dir} lang={lang}>
      <div className="lesson-coach-handle" aria-hidden="true" />
      <div className="lesson-coach-content">
        <p className="lesson-coach-kicker">Learn</p>
        {coach && (
          <>
            <h2>
              <ChessLinkedText
                text={coach.title}
                onHoverSquares={onHoverSquares}
                resolvePeekSquares={resolvePeekSquares}
              />
            </h2>
            <div className="lesson-coach-body">
              {paragraphs.map((paragraph, index) => {
                const { dir: paragraphDir } = detectTextDirection(paragraph);
                return (
                  <p key={index} dir={paragraphDir}>
                    <ChessLinkedText
                      text={paragraph}
                      onHoverSquares={onHoverSquares}
                      resolvePeekSquares={resolvePeekSquares}
                    />
                  </p>
                );
              })}
            </div>
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
              <ChessLinkedText
                text={quizQuestion}
                onHoverSquares={onHoverSquares}
                resolvePeekSquares={resolvePeekSquares}
              />
            </p>
            {quizHint && (
              <p className="lesson-coach-hint">
                <ChessLinkedText
                  text={quizHint}
                  onHoverSquares={onHoverSquares}
                  resolvePeekSquares={resolvePeekSquares}
                />
              </p>
            )}
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
        )}
        {waiting && (
          <div className="lesson-coach-wait">
            <p className="lesson-coach-quiz-label">Your turn</p>
            <p>
              <ChessLinkedText
                text={waitPrompt || ""}
                onHoverSquares={onHoverSquares}
                resolvePeekSquares={resolvePeekSquares}
              />
            </p>
            {waitTimedOut && (
              <p className="lesson-coach-hint">
                The assistant stopped waiting. Copy an answer and paste it in chat.
              </p>
            )}
            <div className="lesson-coach-choices">
              {waitChoices!.map((choice) => {
                const { dir: choiceDir } = detectTextDirection(choice.label);
                return (
                  <div key={choice.id} className="lesson-coach-choice-row">
                    <div
                      role="button"
                      tabIndex={0}
                      className="lesson-coach-choice"
                      dir={choiceDir}
                      onClick={() => {
                        if (waitTimedOut) {
                          void copyChoice(choice);
                          return;
                        }
                        onWaitChoice?.(choice.id, choice.label);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") {
                          return;
                        }
                        event.preventDefault();
                        if (waitTimedOut) {
                          void copyChoice(choice);
                          return;
                        }
                        onWaitChoice?.(choice.id, choice.label);
                      }}
                    >
                      <ChessLinkedText
                        text={choice.label}
                        onHoverSquares={onHoverSquares}
                        resolvePeekSquares={resolvePeekSquares}
                      />
                    </div>
                    <button
                      type="button"
                      className="lesson-coach-copy"
                      onClick={() => void copyChoice(choice)}
                    >
                      {copiedId === choice.id ? "Copied" : "Copy"}
                    </button>
                  </div>
                );
              })}
            </div>
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
