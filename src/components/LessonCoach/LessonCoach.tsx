import { lessonSlideCounter } from "../../lessons/lessonCopy";
import { detectTextDirection } from "../../utils/text-direction";
import { extraCoachParagraphs } from "./extraCoachParagraphs";
import LessonCoachBody from "./LessonCoachBody";
import LessonCoachEmpty from "./LessonCoachEmpty";
import LessonCoachHeading from "./LessonCoachHeading";
import LessonCoachNav from "./LessonCoachNav";
import LessonCoachQuiz from "./LessonCoachQuiz";
import { LessonCoachProps } from "./LessonCoachTypes";
import LessonCoachWait from "./LessonCoachWait";
import { uncoveredMoveText } from "./uncoveredMoveText";
import "./LessonCoach.css";

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
  onPauseLine,
  onStopLine,
  onReplayLine,
  showmePlayback = "idle",
  showmePly = 0,
  playBusy,
  nextGenerating,
  historyIndex,
  historyLength,
}: LessonCoachProps) {
  const waiting = Boolean(waitPrompt && waitChoices && waitChoices.length > 0);

  if (!coach && !quizQuestion && !waiting) {
    return <LessonCoachEmpty />;
  }

  const extraParagraphs = coach ? extraCoachParagraphs(coach) : [];
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

  const linkProps = { onHoverSquares, resolvePeekSquares };

  return (
    <aside className="lesson-coach" dir={dir} lang={lang}>
      <div className="lesson-coach-handle" aria-hidden="true" />
      <div className="lesson-coach-content">
        <LessonCoachHeading
          coach={coach}
          onReset={onReset}
          canReset={canReset}
          {...linkProps}
        />
        {coach && (
          <LessonCoachBody
            coach={coach}
            extraParagraphs={extraParagraphs}
            leftoverMoves={leftoverMoves}
            playMoves={playMoves}
            onPlayMove={onPlayMove}
            playBusy={playBusy}
            onPlayLine={onPlayLine}
            onPauseLine={onPauseLine}
            onStopLine={onStopLine}
            onReplayLine={onReplayLine}
            showmePlayback={showmePlayback}
            showmePly={showmePly}
            {...linkProps}
          />
        )}
        {quizQuestion && (
          <LessonCoachQuiz
            quizQuestion={quizQuestion}
            quizFeedback={quizFeedback}
            quizSecondsLeft={quizSecondsLeft}
            {...linkProps}
          />
        )}
        {waiting && (
          <LessonCoachWait
            waitPrompt={waitPrompt}
            waitChoices={waitChoices!}
            waitTimedOut={waitTimedOut}
            onWaitChoice={onWaitChoice}
            {...linkProps}
          />
        )}
      </div>
      <LessonCoachNav
        slideCount={slideCount}
        dir={dir}
        onBack={onBack}
        onNext={onNext}
        onFirst={onFirst}
        onLast={onLast}
        onFinish={onFinish}
        canBack={canBack}
        canNext={canNext}
        canFirst={canFirst}
        canLast={canLast}
        nextGenerating={nextGenerating}
      />
    </aside>
  );
}
