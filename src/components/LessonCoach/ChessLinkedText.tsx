import { Fragment } from "react";
import { splitTextLines, tokenizeChessText } from "../../utils/chess-text-links";

type Props = {
  text: string;
  onHoverSquares?: (squares: string[]) => void;
};

export default function ChessLinkedText({ text, onHoverSquares }: Props) {
  const parts = tokenizeChessText(text);
  if (parts.length === 0) {
    return null;
  }

  return (
    <>
      {parts.map((part, index) => {
        if (part.type === "text") {
          const lines = splitTextLines(part.value);
          return (
            <span key={index}>
              {lines.map((line, lineIndex) => (
                <Fragment key={lineIndex}>
                  {lineIndex > 0 ? <br /> : null}
                  {line}
                </Fragment>
              ))}
            </span>
          );
        }

        return (
          <a
            key={index}
            href={`#${part.squares.join("-")}`}
            className="chess-ref"
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
