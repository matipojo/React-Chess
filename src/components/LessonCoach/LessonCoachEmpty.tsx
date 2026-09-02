import { useState } from "react";
import { copyPlainText } from "../../lessons/waitForUser";
import {
  buildCodexPromptHref,
  COPIED_PROMPT_TIP,
  EXAMPLE_LESSON_PROMPTS,
  isCodexHost,
  openCodexPrompt,
  sharePromptWithHost,
} from "../../utils/codexPrompt";
import { CopiedCheckIcon, CopyIcon } from "./LessonCoachIcons";

export default function LessonCoachEmpty({
  examplePrompts,
}: {
  examplePrompts?: string[];
}) {
  const [copiedId, setCopiedId] = useState<string>("");
  const openInCodex = isCodexHost();
  const prompts = examplePrompts || EXAMPLE_LESSON_PROMPTS;

  return (
    <aside className="lesson-coach">
      <div className="lesson-coach-handle" aria-hidden="true" />
      <div className="lesson-coach-content lesson-coach-empty">
        <p className="lesson-coach-kicker">Generative Learning</p>
        <h2>Your turn, generate your lesson</h2>
        <div className="lesson-coach-examples">
          {prompts.map((prompt) =>
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
              <span key={prompt} className="lesson-coach-example-wrap">
                <button
                  type="button"
                  className={
                    copiedId === prompt
                      ? "lesson-coach-example is-copied"
                      : "lesson-coach-example"
                  }
                  title="Copy prompt"
                  aria-describedby={
                    copiedId === prompt ? "lesson-coach-copied-tip" : undefined
                  }
                  onClick={async () => {
                    const result = await sharePromptWithHost(
                      prompt,
                      copyPlainText
                    );
                    if (result !== "copied") {
                      return;
                    }
                    setCopiedId(prompt);
                    window.setTimeout(() => setCopiedId(""), 5500);
                  }}
                >
                  <span className="lesson-coach-example-copy" aria-hidden="true">
                    <CopyIcon />
                  </span>
                  {prompt}
                </button>
                {copiedId === prompt ? (
                  <>
                    <span className="lesson-coach-example-mark" aria-hidden="true">
                      <CopiedCheckIcon />
                    </span>
                    <span
                      id="lesson-coach-copied-tip"
                      className="lesson-coach-example-tip"
                      role="status"
                    >
                      {COPIED_PROMPT_TIP}
                    </span>
                  </>
                ) : null}
              </span>
            )
          )}
        </div>
        <p>
          Everything you learn here is created in the chat. Ask the agent
          to teach you a topic and it builds a lesson with steps. Ask it to
          show you a line and it plays the moves live with one explanation.
        </p>
        <p>
          When you are ready, it can also quiz you on any topic you have
          already covered.
        </p>
      </div>
    </aside>
  );
}
