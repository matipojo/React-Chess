import { Fragment } from "react";
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
};

function ChessParts({
  parts,
  onHoverSquares,
  resolvePeekSquares,
}: {
  parts: ChessTextPart[];
  onHoverSquares?: (squares: string[]) => void;
  resolvePeekSquares?: (ref: ChessRefPart) => string[];
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

        return (
          <button
            key={index}
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
        );
      })}
    </>
  );
}

function CoachLine({
  line,
  onHoverSquares,
  resolvePeekSquares,
}: {
  line: string;
  onHoverSquares?: (squares: string[]) => void;
  resolvePeekSquares?: (ref: ChessRefPart) => string[];
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
        />
      ))}
    </>
  );
}
