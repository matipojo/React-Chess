import { CoachState } from "../../lessons/types";
import { showmeControls } from "../../lessons/showMe";
import { detectTextDirection } from "../../utils/text-direction";
import LessonCoachPlayback from "./LessonCoachPlayback";
import LessonLinkedText from "./LessonLinkedText";
import {
  LessonCoachLinkProps,
  LessonCoachPlayProps,
  LessonCoachShowMeProps,
} from "./LessonCoachTypes";

type Props = LessonCoachLinkProps &
  LessonCoachPlayProps &
  LessonCoachShowMeProps & {
    coach: CoachState;
    extraParagraphs: string[];
    leftoverMoves: string;
    whatLabel?: string;
  };

export default function LessonCoachBody({
  coach,
  extraParagraphs,
  leftoverMoves,
  onHoverSquares,
  resolvePeekSquares,
  playMoves,
  onPlayMove,
  playBusy,
  onPlayLine,
  onPauseLine,
  onStopLine,
  onReplayLine,
  showmePlayback = "idle",
  showmePly = 0,
  linkMode,
  knownIds,
  whatLabel = "Move",
}: Props) {
  const isShowme = coach.phase === "showme";
  const playback = showmeControls(
    showmePlayback,
    showmePly,
    coach.moves?.length || 0
  );

  return (
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
      {isShowme && <p className="lesson-coach-recap-label">Show me</p>}
      {coach.phase === "recap" && (
        <p className="lesson-coach-recap-label">Recap</p>
      )}
      <div className="lesson-coach-body">
        {!isShowme && coach.why && (
          <p className="lesson-coach-why">
            <span className="lesson-coach-field-label">Why</span>
            <LessonLinkedText
              text={coach.why}
              linkMode={linkMode}
              knownIds={knownIds}
              onHoverSquares={onHoverSquares}
              resolvePeekSquares={resolvePeekSquares}
            />
          </p>
        )}
        {!isShowme && (coach.what || leftoverMoves) && (
          <p className="lesson-coach-what">
            <span className="lesson-coach-field-label">{whatLabel}</span>
            {coach.what && (
              <LessonLinkedText
                text={coach.what}
                linkMode={linkMode}
                knownIds={knownIds}
                onHoverSquares={onHoverSquares}
                resolvePeekSquares={resolvePeekSquares}
                playMoves={playMoves}
                onPlayMove={onPlayMove}
                playBusy={playBusy}
              />
            )}
            {leftoverMoves ? (
              <LessonLinkedText
                text={leftoverMoves}
                linkMode={linkMode}
                knownIds={knownIds}
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
              <LessonLinkedText
                text={paragraph}
                linkMode={linkMode}
                knownIds={knownIds}
                onHoverSquares={onHoverSquares}
                resolvePeekSquares={resolvePeekSquares}
              />
            </p>
          );
        })}
        {isShowme && (
          <LessonCoachPlayback
            playback={playback}
            onPlayLine={onPlayLine}
            onPauseLine={onPauseLine}
            onStopLine={onStopLine}
            onReplayLine={onReplayLine}
          />
        )}
      </div>
    </>
  );
}
