import { useState } from "react";
import { CoachState, WaitChoice } from "../../lessons/types";
import { CoachPlayMove } from "../../lessons/stepPlay";
import { lessonSlideCounter } from "../../lessons/lessonCopy";
import { normalizeCoachCopy } from "../../lessons/coachParagraphs";
import { copyPlainText, copyWaitChoice } from "../../lessons/waitForUser";
import { detectTextDirection } from "../../utils/text-direction";
import ChessLinkedText from "./ChessLinkedText";
import { ChessRefPart } from "../../utils/chess-text-links";
import {
  buildCodexPromptHref,
  EXAMPLE_LESSON_PROMPTS,
  isCodexHost,
} from "../../utils/codexPrompt";
import "./LessonCoach.css";

function uncoveredMoveText(
  what: string | undefined,
  playMoves?: CoachPlayMove[]
): string {
  if (!playMoves || playMoves.length === 0) {
    return "";
  }
  const lower = (what || "").toLowerCase();
  const missing = playMoves.filter((move) => {
    const dest = move.notation.split(":")[1];
    return (
      lower.indexOf(move.notation.toLowerCase()) < 0 &&
      (!dest || lower.indexOf(dest.toLowerCase()) < 0)
    );
  });
  return missing.map((move) => move.notation).join(" ");
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 5V2L7 7l5 5V9c2.76 0 5 2.24 5 5a5 5 0 0 1-9.9 1H6.02A7 7 0 0 0 19 14c0-3.87-3.13-7-7-7z"
      />
    </svg>
  );
}

function SkipStartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M6 6h2.2v12H6V6zm4.2 6 8.8 6V6l-8.8 6z" />
    </svg>
  );
}

function SkipEndIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M15.8 6H18v12h-2.2V6zM5 18l8.8-6L5 6v12z" />
    </svg>
  );
}

type Props = {
  coach: CoachState | null;
  quizQuestion?: string;
  quizFeedback?: string;
  quizSecondsLeft?: number | null;
  waitPrompt?: string;
  waitChoices?: WaitChoice[];
  waitTimedOut?: boolean;
  onWaitChoice?: (action: string, label: string) => void;
  onHoverSquares?: (squares: string[]) => void;
  resolvePeekSquares?: (ref: ChessRefPart) => string[];
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
  playMoves?: CoachPlayMove[];
  onPlayMove?: (notation: string) => void;
  onPlayLine?: () => void;
  playBusy?: boolean;
  nextGenerating?: boolean;
  historyIndex?: number;
  historyLength?: number;
};

export default function LessonCoach({
  coach,
  quizQuestion,
  quizFeedback,
  quizSecondsLeft,
  waitPrompt,
  waitChoices,
  waitTimedOut,
  onWaitChoice,
  onHoverSquares,
  resolvePeekSquares,
  onBack,
  onNext,
  onFirst,
  onLast,
  onReset,
  onFinish,
  canBack,
  canNext,
  canFirst,
  canLast,
  canReset,
  playMoves,
  onPlayMove,
  onPlayLine,
  playBusy,
  nextGenerating,
  historyIndex,
  historyLength,
}: Props) {
  const [copiedId, setCopiedId] = useState<string>("");
  const waiting = Boolean(waitPrompt && waitChoices && waitChoices.length > 0);
  const openInCodex = isCodexHost();

  if (!coach && !quizQuestion && !waiting) {
    return (
      <aside className="lesson-coach">
        <div className="lesson-coach-handle" aria-hidden="true" />
        <div className="lesson-coach-content lesson-coach-empty">
          <p className="lesson-coach-kicker">Generative Learning</p>
          <h2>Your turn, generate your lesson</h2>
          <div className="lesson-coach-examples">
            {EXAMPLE_LESSON_PROMPTS.map((prompt) =>
              openInCodex ? (
                <a
                  key={prompt}
                  className="lesson-coach-example"
                  href={buildCodexPromptHref(prompt)}
                >
                  {prompt}
                </a>
              ) : (
                <button
                  key={prompt}
                  type="button"
                  className="lesson-coach-example"
                  onClick={async () => {
                    const ok = await copyPlainText(prompt);
                    if (!ok) {
                      return;
                    }
                    setCopiedId(prompt);
                    window.setTimeout(() => setCopiedId(""), 2000);
                  }}
                >
                  {copiedId === prompt ? "Copied" : prompt}
                </button>
              )
            )}
          </div>
          <p>
            Everything you learn here is created in the chat. Ask the agent
            to teach you a topic and it builds a lesson with steps. Ask it to
            show you a line and it plays the moves live with one explanation.
          </p>
          <p>
            When you are ready, it can also quiz you on any topic you have
            already covered.
          </p>
        </div>
      </aside>
    );
  }

  const extraParagraphs = coach
    ? coach.what || coach.why
      ? (coach.paragraphs || []).map((part) => part.trim()).filter((part) => {
          return part && part !== coach.what && part !== coach.why;
        })
      : normalizeCoachCopy({
          body: coach.body,
          paragraphs: coach.paragraphs,
        }).paragraphs
    : [];

  const leftoverMoves = coach ? uncoveredMoveText(coach.what, playMoves) : "";
  const slideCount = lessonSlideCounter({
    step: coach?.step,
    totalSteps: coach?.totalSteps,
    phase: coach?.phase,
    historyIndex,
    historyLength,
  });

  const { dir, lang } = detectTextDirection(
    [
      coach?.lessonTitle,
      coach?.title,
      coach?.what,
      coach?.why,
      ...extraParagraphs,
      quizQuestion,
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
        <div className="lesson-coach-heading">
          <div className="lesson-coach-heading-text">
            <p className="lesson-coach-kicker">Learn</p>
            {coach?.lessonTitle && coach.phase !== "goal" && coach.phase !== "showme" && (
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
        {coach && (
          <>
            {coach.phase === "goal" && (
              <p className="lesson-coach-recap-label">Goal</p>
            )}
            {coach.phase === "step" && (
              <p className="lesson-coach-recap-label">Step</p>
            )}
            {coach.phase === "riddle" && (
              <p className="lesson-coach-recap-label">Riddle</p>
            )}
            {coach.phase === "showme" && (
              <p className="lesson-coach-recap-label">Show me</p>
            )}
            {coach.phase === "recap" && (
              <p className="lesson-coach-recap-label">Recap</p>
            )}
            <div className="lesson-coach-body">
              {coach.phase !== "showme" && coach.why && (
                <p className="lesson-coach-why">
                  <span className="lesson-coach-field-label">Why</span>
                  <ChessLinkedText
                    text={coach.why}
                    onHoverSquares={onHoverSquares}
                    resolvePeekSquares={resolvePeekSquares}
                  />
                </p>
              )}
              {coach.phase !== "showme" && (coach.what || leftoverMoves) && (
                <p className="lesson-coach-what">
                  <span className="lesson-coach-field-label">Move</span>
                  {coach.what && (
                    <ChessLinkedText
                      text={coach.what}
                      onHoverSquares={onHoverSquares}
                      resolvePeekSquares={resolvePeekSquares}
                      playMoves={playMoves}
                      onPlayMove={onPlayMove}
                      playBusy={playBusy}
                    />
                  )}
                  {leftoverMoves ? (
                    <ChessLinkedText
                      text={leftoverMoves}
                      onHoverSquares={onHoverSquares}
                      resolvePeekSquares={resolvePeekSquares}
                      playMoves={playMoves}
                      onPlayMove={onPlayMove}
                      playBusy={playBusy}
                    />
                  ) : null}
                </p>
              )}
              {extraParagraphs.map((paragraph, index) => {
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
              {coach.phase === "showme" && onPlayLine && (
                <button
                  type="button"
                  className="lesson-coach-play-line"
                  dir="ltr"
                  onClick={onPlayLine}
                  disabled={playBusy}
                  aria-label="Play the line"
                >
                  Play
                </button>
              )}
            </div>
          </>
        )}
        {quizQuestion && (
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
                The agent stopped waiting. Copy an answer and paste it in chat.
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
      {(onBack || onNext || nextGenerating || onFinish) && (
        <div className="lesson-coach-nav-wrap">
          {slideCount && (onBack || onNext || nextGenerating) && (
            <p
              className="lesson-coach-slide-count"
              dir="ltr"
              aria-live="polite"
              aria-label={`Slide ${slideCount.current} of ${slideCount.total}`}
            >
              {slideCount.current}/{slideCount.total}
            </p>
          )}
          {(onBack || onNext || nextGenerating) && (
            <div className="lesson-coach-nav" dir="ltr">
              {onFirst && (
                <button
                  type="button"
                  className="lesson-coach-nav-icon"
                  aria-label="First step"
                  title="First step"
                  onClick={onFirst}
                  disabled={!canFirst}
                >
                  <SkipStartIcon />
                </button>
              )}
              <button type="button" onClick={onBack} disabled={!canBack}>
                Back
              </button>
              <button
                type="button"
                className={
                  nextGenerating ? "lesson-coach-next-generating" : undefined
                }
                onClick={onNext}
                disabled={!canNext || nextGenerating}
                aria-busy={nextGenerating ? true : undefined}
                aria-label={nextGenerating ? "Generating next screen" : "Next"}
              >
                {nextGenerating ? (
                  <span className="lesson-generating-label">
                    Generating
                    <span className="lesson-generating-dots" aria-hidden="true" />
                  </span>
                ) : (
                  "Next"
                )}
              </button>
              {onLast && (
                <button
                  type="button"
                  className="lesson-coach-nav-icon"
                  aria-label="Last step"
                  title="Last step"
                  onClick={onLast}
                  disabled={!canLast}
                >
                  <SkipEndIcon />
                </button>
              )}
            </div>
          )}
          {onFinish && (
            <button
              type="button"
              className="lesson-coach-finish"
              aria-label="Finish lesson"
              onClick={onFinish}
            >
              {dir === "rtl" ? "סיום" : "Finish"}
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
