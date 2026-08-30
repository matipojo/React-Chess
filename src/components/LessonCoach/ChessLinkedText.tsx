import { Fragment } from "react";
import {
  ChessTextPart,
  groupLtrRuns,
  splitTextLines,
  tokenizeChessText,
} from "../../utils/chess-text-links";

type Props = {
  text: string;
  onHoverSquares?: (squares: string[]) => void;
};

function TextWithBreaks({ text }: { text: string }) {
  const lines = splitTextLines(text);
  return (
    <>
      {lines.map((line, lineIndex) => (
        <Fragment key={lineIndex}>
          {lineIndex > 0 ? <br /> : null}
          {line}
        </Fragment>
      ))}
    </>
  );
}

function ChessParts({
  parts,
  onHoverSquares,
}: {
  parts: ChessTextPart[];
  onHoverSquares?: (squares: string[]) => void;
}) {
  return (
    <>
      {parts.map((part, index) => {
        if (part.type === "text") {
          return (
            <span key={index}>
              <TextWithBreaks text={part.value} />
            </span>
          );
        }

        return (
          <a
            key={index}
            href={`#${part.squares.join("-")}`}
            className="chess-ref"
            dir="ltr"
            onClick={(event) => event.preventDefault()}
            onMouseEnter={() => onHoverSquares?.(part.squares)}
            onMouseLeave={() => onHoverSquares?.([])}
            onFocus={() => onHoverSquares?.(part.squares)}
            onBlur={() => onHoverSquares?.([])}
          >
            {part.value}
          </a>
        );
      })}
    </>
  );
}

export default function ChessLinkedText({ text, onHoverSquares }: Props) {
  const groups = groupLtrRuns(tokenizeChessText(text));
  if (groups.length === 0) {
    return null;
  }

  return (
    <>
      {groups.map((group, index) => {
        if (group.type === "text") {
          return (
            <span key={index}>
              <TextWithBreaks text={group.value} />
            </span>
          );
        }

        return (
          <span key={index} className="ltr-run" dir="ltr">
            <ChessParts parts={group.parts} onHoverSquares={onHoverSquares} />
          </span>
        );
      })}
    </>
  );
}
