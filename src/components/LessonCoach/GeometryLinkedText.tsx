import { CoachPlayMove } from "../../lessons/stepPlay";
import {
  groupLtrRuns,
  splitTextLines,
} from "../../utils/chess-text-links";
import { detectTextDirection } from "../../utils/text-direction";
import { tokenizeGanText } from "../../geometry/text-links";
import { GanRefPart, GanTextPart } from "../../geometry/types";
import { matchPlayGan, CoachPlayGan } from "../../geometry/stepPlay";
import { Fragment } from "react";

type Props = {
  text: string;
  knownIds?: string[];
  onHoverIds?: (ids: string[]) => void;
  playMoves?: CoachPlayGan[] | CoachPlayMove[];
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

function GanParts({
  parts,
  onHoverIds,
  playMoves,
  onPlayMove,
  playBusy,
}: {
  parts: GanTextPart[];
  onHoverIds?: (ids: string[]) => void;
  playMoves?: CoachPlayGan[] | CoachPlayMove[];
  onPlayMove?: (notation: string) => void;
  playBusy?: boolean;
}) {
  return (
    <>
      {parts.map((part, index) => {
        if (part.type === "text") {
          return <Fragment key={index}>{part.value}</Fragment>;
        }
        const play = matchPlayGan(playMoves as CoachPlayGan[] | undefined, part.command);
        return (
          <span key={index} className="chess-ref-wrap">
            <button
              type="button"
              className="chess-ref"
              dir="ltr"
              onClick={(event) => event.stopPropagation()}
              onPointerEnter={() => onHoverIds?.(part.ids)}
              onPointerLeave={(event) => {
                if (event.currentTarget !== document.activeElement) {
                  onHoverIds?.([]);
                }
              }}
              onFocus={() => onHoverIds?.(part.ids)}
              onBlur={() => onHoverIds?.([])}
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
  knownIds,
  onHoverIds,
  playMoves,
  onPlayMove,
  playBusy,
}: {
  line: string;
  knownIds?: string[];
  onHoverIds?: (ids: string[]) => void;
  playMoves?: CoachPlayGan[] | CoachPlayMove[];
  onPlayMove?: (notation: string) => void;
  playBusy?: boolean;
}) {
  const { dir } = detectTextDirection(line);
  const groups = groupLtrRuns(tokenizeGanText(line, knownIds) as any);

  return (
    <span className="coach-line" dir={dir}>
      {dir === "rtl" ? "\u200F" : null}
      {groups.map((group, index) => {
        if (group.type === "text") {
          return <Fragment key={index}>{group.value}</Fragment>;
        }
        return (
          <bdi key={index} className="ltr-run">
            <GanParts
              parts={group.parts as GanTextPart[]}
              onHoverIds={onHoverIds}
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

export default function GeometryLinkedText({
  text,
  knownIds,
  onHoverIds,
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
          knownIds={knownIds}
          onHoverIds={onHoverIds}
          playMoves={playMoves}
          onPlayMove={onPlayMove}
          playBusy={playBusy}
        />
      ))}
    </>
  );
}

export type { GanRefPart };
