import ChessLinkedText from "./ChessLinkedText";
import GeometryLinkedText from "./GeometryLinkedText";
import { LessonCoachLinkProps, LessonCoachPlayProps } from "./LessonCoachTypes";

type Props = LessonCoachLinkProps &
  LessonCoachPlayProps & {
    text: string;
  };

export default function LessonLinkedText({
  text,
  linkMode = "chess",
  knownIds,
  onHoverSquares,
  resolvePeekSquares,
  playMoves,
  onPlayMove,
  playBusy,
}: Props) {
  if (linkMode === "triangles") {
    return (
      <GeometryLinkedText
        text={text}
        knownIds={knownIds}
        onHoverIds={onHoverSquares}
        playMoves={playMoves}
        onPlayMove={onPlayMove}
        playBusy={playBusy}
      />
    );
  }
  return (
    <ChessLinkedText
      text={text}
      onHoverSquares={onHoverSquares}
      resolvePeekSquares={resolvePeekSquares}
      playMoves={playMoves}
      onPlayMove={onPlayMove}
      playBusy={playBusy}
    />
  );
}
