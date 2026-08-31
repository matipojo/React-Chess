import { Fragment } from "react";
import { CoachPlayMove, matchPlayMove } from "../../lessons/stepPlay";
import {
  ChessRefPart,
  ChessTextPart,
  groupLtrRuns,
  splitTextLines,
  tokenizeChessText,
} from "../../utils/chess-text-links";
import { detectTextDirection } from "../../utils/text-direction";

type Props = {
  text: string;
  onHoverSquares?: (squares: string[]) => void;
  resolvePeekSquares?: (ref: ChessRefPart) => string[];
  playMoves?: CoachPlayMove[];
  onPlayMove?: (notation: string) => void;
  playBusy?: boolean;
};

function PlayIcon() {
  return (
    <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
      <path fill="currentColor" d="M3.2 1.6v8.8L10.4 6z" />
    </svg>
  );
}

function ChessParts({
  parts,
  onHoverSquares,
  resolvePeekSquares,
  playMoves,
  onPlayMove,
  playBusy,
}: {
  parts: ChessTextPart[];
  onHoverSquares?: (squares: string[]) => void;
  resolvePeekSquares?: (ref: ChessRefPart) => string[];
  playMoves?: CoachPlayMove[];
  onPlayMove?: (notation: string) => void;
  playBusy?: boolean;
}) {
  return (
    <>
      {parts.map((part, index) => {
        if (part.type === "text") {
          return <Fragment key={index}>{part.value}</Fragment>;
        }

        const squares = resolvePeekSquares
          ? resolvePeekSquares(part)
          : part.squares;
        const play = matchPlayMove(playMoves, part.value, part.squares, part.dest);

        return (
          <span key={index} className="chess-ref-wrap">
            <button
              type="button"
              className="chess-ref"
              dir="ltr"
              onClick={(event) => event.stopPropagation()}
              onPointerEnter={() => onHoverSquares?.(squares)}
              onPointerLeave={(event) => {
                if (event.currentTarget !== document.activeElement) {
                  onHoverSquares?.([]);
                }
              }}
              onFocus={() => onHoverSquares?.(squares)}
              onBlur={() => onHoverSquares?.([])}
            >
              {part.value}
            </button>
            {play && play.status === "ready" && onPlayMove && (
              <button
                type="button"
                className="lesson-play-move"
                dir="ltr"
                disabled={playBusy}
                aria-label={`Play ${play.notation}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onPlayMove(play.notation);
                }}
              >
                <PlayIcon />
              </button>
            )}
          </span>
        );
      })}
    </>
  );
}

function CoachLine({
  line,
  onHoverSquares,
  resolvePeekSquares,
  playMoves,
  onPlayMove,
  playBusy,
}: {
  line: string;
  onHoverSquares?: (squares: string[]) => void;
  resolvePeekSquares?: (ref: ChessRefPart) => string[];
  playMoves?: CoachPlayMove[];
  onPlayMove?: (notation: string) => void;
  playBusy?: boolean;
}) {
  const { dir } = detectTextDirection(line);
  const groups = groupLtrRuns(tokenizeChessText(line));

  return (
    <span className="coach-line" dir={dir}>
      {dir === "rtl" ? "\u200F" : null}
      {groups.map((group, index) => {
        if (group.type === "text") {
          return <Fragment key={index}>{group.value}</Fragment>;
        }

        return (
          <bdi key={index} className="ltr-run">
            <ChessParts
              parts={group.parts}
              onHoverSquares={onHoverSquares}
              resolvePeekSquares={resolvePeekSquares}
              playMoves={playMoves}
              onPlayMove={onPlayMove}
              playBusy={playBusy}
            />
          </bdi>
        );
      })}
    </span>
  );
}

export default function ChessLinkedText({
  text,
  onHoverSquares,
  resolvePeekSquares,
  playMoves,
  onPlayMove,
  playBusy,
}: Props) {
  const lines = splitTextLines(text);
  if (lines.length === 0) {
    return null;
  }

  return (
    <>
      {lines.map((line, index) => (
        <CoachLine
          key={index}
          line={line}
          onHoverSquares={onHoverSquares}
          resolvePeekSquares={resolvePeekSquares}
          playMoves={playMoves}
          onPlayMove={onPlayMove}
          playBusy={playBusy}
        />
      ))}
    </>
  );
}
