import { useState } from "react";
import { copyPlainText } from "../../lessons/waitForUser";
import {
  buildCodexPromptHref,
  EXAMPLE_LESSON_PROMPTS,
  isCodexHost,
  openCodexPrompt,
  sharePromptWithHost,
} from "../../utils/codexPrompt";

export default function LessonCoachEmpty() {
  const [copiedId, setCopiedId] = useState<string>("");
  const openInCodex = isCodexHost();

  return (
    <aside className="lesson-coach">
      <div className="lesson-coach-handle" aria-hidden="true" />
      <div className="lesson-coach-content lesson-coach-empty">
        <p className="lesson-coach-kicker">Generative Learning</p>
        <h2>Your turn, generate your lesson</h2>
        <div className="lesson-coach-examples">
          {EXAMPLE_LESSON_PROMPTS.map((prompt) =>
            openInCodex ? (
              <a
                key={prompt}
                className="lesson-coach-example"
                href={buildCodexPromptHref(prompt)}
                onClick={(event) => {
                  event.preventDefault();
                  openCodexPrompt(prompt);
                }}
              >
                {prompt}
              </a>
            ) : (
              <button
                key={prompt}
                type="button"
                className="lesson-coach-example"
                onClick={async () => {
                  const result = await sharePromptWithHost(
                    prompt,
                    copyPlainText
                  );
                  if (result !== "copied") {
                    return;
                  }
                  setCopiedId(prompt);
                  window.setTimeout(() => setCopiedId(""), 2000);
                }}
              >
                {copiedId === prompt ? "Copied" : prompt}
              </button>
            )
          )}
        </div>
        <p>
          Everything you learn here is created in the chat. Tell the agent
          what you want to study, and it builds a lesson with steps that match
          your request.
        </p>
        <p>
          When you are ready, it can also quiz you on any topic you have
          already covered.
        </p>
      </div>
    </aside>
  );
}
