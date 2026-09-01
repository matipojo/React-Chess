import { CoachState } from "../../lessons/types";
import { detectTextDirection } from "../../utils/text-direction";
import ChessLinkedText from "./ChessLinkedText";
import { LessonCoachLinkProps, LessonCoachPlayProps } from "./LessonCoachTypes";

type Props = LessonCoachLinkProps &
  LessonCoachPlayProps & {
    coach: CoachState;
    extraParagraphs: string[];
    leftoverMoves: string;
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
}: Props) {
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
      {coach.phase === "recap" && (
        <p className="lesson-coach-recap-label">Recap</p>
      )}
      <div className="lesson-coach-body">
        {coach.why && (
          <p className="lesson-coach-why">
            <span className="lesson-coach-field-label">Why</span>
            <ChessLinkedText
              text={coach.why}
              onHoverSquares={onHoverSquares}
              resolvePeekSquares={resolvePeekSquares}
            />
          </p>
        )}
        {(coach.what || leftoverMoves) && (
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
      </div>
    </>
  );
}
