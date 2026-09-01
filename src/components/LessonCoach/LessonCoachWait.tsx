import { useState } from "react";
import { WaitChoice } from "../../lessons/types";
import {
  copyPlainText,
  formatWaitChoiceCopy,
} from "../../lessons/waitForUser";
import { detectTextDirection } from "../../utils/text-direction";
import {
  buildCodexPromptHref,
  isCodexHost,
  sharePromptWithHost,
} from "../../utils/codexPrompt";
import ChessLinkedText from "./ChessLinkedText";
import { LessonCoachLinkProps } from "./LessonCoachTypes";

type Props = LessonCoachLinkProps & {
  waitPrompt?: string;
  waitChoices: WaitChoice[];
  waitTimedOut?: boolean;
  onWaitChoice?: (action: string, label: string) => void;
};

export default function LessonCoachWait({
  waitPrompt,
  waitChoices,
  waitTimedOut,
  onWaitChoice,
  onHoverSquares,
  resolvePeekSquares,
}: Props) {
  const [copiedId, setCopiedId] = useState<string>("");
  const openInCodex = isCodexHost();

  async function shareChoice(choice: WaitChoice) {
    const text = formatWaitChoiceCopy(waitPrompt || "", choice);
    const result = await sharePromptWithHost(text, copyPlainText);
    if (result !== "copied") {
      return;
    }
    setCopiedId(choice.id);
    window.setTimeout(() => {
      setCopiedId((current) => (current === choice.id ? "" : current));
    }, 1500);
  }

  return (
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
        {waitChoices.map((choice) => {
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
                    void shareChoice(choice);
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
                    void shareChoice(choice);
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
              {openInCodex ? (
                <a
                  className="lesson-coach-copy"
                  href={buildCodexPromptHref(
                    formatWaitChoiceCopy(waitPrompt || "", choice)
                  )}
                  onClick={(event) => {
                    event.preventDefault();
                    void shareChoice(choice);
                  }}
                >
                  Open
                </a>
              ) : (
                <button
                  type="button"
                  className="lesson-coach-copy"
                  onClick={() => void shareChoice(choice)}
                >
                  {copiedId === choice.id ? "Copied" : "Copy"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
