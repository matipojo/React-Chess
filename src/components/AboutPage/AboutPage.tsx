import { FormEvent, useState } from "react";
import Chessboard from "../Chessboard/Chessboard";
import GeometryCanvas from "../GeometryCanvas/GeometryCanvas";
import { boardFromFen } from "../../utils/board-setup";
import { figureFromTemplate } from "../../geometry/templates";
import { copyPlainText } from "../../lessons/waitForUser";
import {
  ABOUT_DEMO_FIGURE_ID,
  ABOUT_EXAMPLE_PROMPTS,
  ITALIAN_GAME_ARROWS,
  ITALIAN_GAME_FEN,
} from "./aboutDemo";
import {
  CHESS_PATH,
  HOME_PATH,
  TRIANGLES_PATH,
  appHref,
} from "../../utils/appRoute";
import { useHomePageTools } from "../../hooks/useHomePageTools";
import {
  buildCodexPromptHref,
  CODEX_UNAVAILABLE_MESSAGE,
  COPIED_PROMPT_TIP,
  isCodexHost,
  openCodexPrompt,
  sharePromptWithHost,
} from "../../utils/codexPrompt";
import { CopiedCheckIcon, CopyIcon } from "../LessonCoach/LessonCoachIcons";
import "../LessonCoach/LessonCoach.css";
import "../GeometryCanvas/GeometryCanvas.css";
import "../../board-themes.css";
import "./AboutPage.css";

const GITHUB_REPO_URL = "https://github.com/matipojo/webmcp-react-chess";

const italianBoard = boardFromFen(ITALIAN_GAME_FEN, true);
const demoFigure = figureFromTemplate(ABOUT_DEMO_FIGURE_ID);

function pieceSrc(name: string) {
  return `${process.env.PUBLIC_URL}/assets/images/${name}.png`;
}

function LogoMark() {
  return (
    <svg className="about-logo-mark" viewBox="0 0 36 36" aria-hidden="true">
      <path fill="#9b74d8" d="M18 2l12 7-12 7L6 9z" />
      <path fill="#7c4dcc" d="M18 10l12 7-12 7-12-7z" />
      <path fill="#4a2a72" d="M18 18l12 7-12 7-12-7z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  );
}

async function shareLessonPrompt(prompt: string): Promise<"opened" | "copied" | "failed" | "empty"> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return "empty";
  }
  if (isCodexHost()) {
    openCodexPrompt(trimmed);
    return "opened";
  }
  return sharePromptWithHost(trimmed, copyPlainText);
}

function CodexPromptField({
  placeholder,
  submitName,
  id,
}: {
  placeholder: string;
  submitName: string;
  id: string;
}) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState("");
  const openInCodex = isCodexHost();
  const trimmed = value.trim();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const result = await shareLessonPrompt(value);
    if (result === "copied") {
      setStatus(CODEX_UNAVAILABLE_MESSAGE);
      window.setTimeout(() => setStatus(""), 2500);
    }
  }

  return (
    <form className="about-prompt" onSubmit={onSubmit}>
      <label className="about-prompt-label" htmlFor={id}>
        {placeholder}
      </label>
      <div className="about-prompt-row">
        <input
          id={id}
          className="about-prompt-input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
        />
        {openInCodex ? (
          <a
            className="about-prompt-submit"
            href={trimmed ? buildCodexPromptHref(trimmed) : "#"}
            aria-disabled={!trimmed ? true : undefined}
            aria-label={submitName}
            onClick={(event) => {
              if (!trimmed) {
                event.preventDefault();
                return;
              }
              event.preventDefault();
              openCodexPrompt(trimmed);
            }}
          >
            <ArrowIcon />
          </a>
        ) : (
          <button
            type="submit"
            className="about-prompt-submit"
            aria-label={submitName}
            disabled={!trimmed}
          >
            <ArrowIcon />
          </button>
        )}
      </div>
      {status ? (
        <p className="about-prompt-status" role="status">
          {status}
        </p>
      ) : null}
    </form>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M5 12h11.2l-3.6-3.6L14 7l6 5-6 5-1.4-1.4 3.6-3.6H5z"
      />
    </svg>
  );
}

function ExamplePrompts() {
  const [copiedId, setCopiedId] = useState("");
  const [status, setStatus] = useState("");
  const openInCodex = isCodexHost();

  return (
    <div>
      <div className="about-examples">
        {ABOUT_EXAMPLE_PROMPTS.map((prompt) =>
          openInCodex ? (
            <a
              key={prompt}
              className="about-example"
              href={buildCodexPromptHref(prompt)}
              onClick={(event) => {
                event.preventDefault();
                openCodexPrompt(prompt);
              }}
            >
              {prompt}
            </a>
          ) : (
            <span key={prompt} className="about-example-wrap">
              <button
                type="button"
                className={
                  copiedId === prompt ? "about-example is-copied" : "about-example"
                }
                title="Copy prompt"
                aria-describedby={
                  copiedId === prompt ? "about-copied-tip" : undefined
                }
                onClick={async () => {
                  const result = await shareLessonPrompt(prompt);
                  if (result !== "copied") {
                    return;
                  }
                  setCopiedId(prompt);
                  setStatus(CODEX_UNAVAILABLE_MESSAGE);
                  window.setTimeout(() => {
                    setCopiedId("");
                    setStatus("");
                  }, 5500);
                }}
              >
                <span className="about-example-copy" aria-hidden="true">
                  <CopyIcon />
                </span>
                {prompt}
              </button>
              {copiedId === prompt ? (
                <>
                  <span className="about-example-mark" aria-hidden="true">
                    <CopiedCheckIcon />
                  </span>
                  <span
                    id="about-copied-tip"
                    className="about-example-tip"
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
      {status ? (
        <p className="about-prompt-status" role="status">
          {status}
        </p>
      ) : null}
    </div>
  );
}

function MiniSurface() {
  return (
    <span className="about-mini-surface" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export default function AboutPage() {
  useHomePageTools();

  return (
    <div className="about-page">
      <header className="about-header">
        <a className="about-brand" href={appHref(HOME_PATH)}>
          <LogoMark />
          <span>Generative Learning</span>
        </a>
        <nav className="about-subnav" aria-label="Learning surfaces">
          <a className="about-subnav-chess" href={appHref(CHESS_PATH)}>
            Chess
          </a>
          <a className="about-subnav-triangles" href={appHref(TRIANGLES_PATH)}>
            Triangles
          </a>
        </nav>
      </header>

      <main>
        <section className="about-hero">
          <p className="about-kicker">
            We build the learning surface once. Your AI agent personalizes the lesson endlessly.
          </p>
          <h1>
            Generate the learning. <span>Not the canvas.</span>
          </h1>
          <p className="about-lede">
            You learn on a real chessboard or triangle canvas, not in a chat.
          </p>
          <p className="about-lede about-lede-more">
            Ask what you want to learn. Your AI agent teaches you there, and
            the lesson follows you.
          </p>
          <CodexPromptField
            id="about-hero-prompt"
            placeholder="What do you want to learn?"
            submitName="Start learning"
          />
          <ExamplePrompts />
        </section>

        <section className="about-demo" data-board-theme="purple" aria-label="Example boards">
          <div className="about-demo-surfaces">
            <article className="about-demo-surface">
              <div className="about-demo-board">
                <Chessboard
                  playMove={() => false}
                  pieces={italianBoard.pieces}
                  arrows={ITALIAN_GAME_ARROWS}
                  locked
                />
              </div>
              <a href={appHref(CHESS_PATH)}>
                <strong>Chess</strong>
                <span>Learn on a real chessboard</span>
              </a>
            </article>
            <article className="about-demo-surface">
              <div className="about-demo-board">
                {demoFigure ? (
                  <GeometryCanvas figure={demoFigure} locked />
                ) : null}
              </div>
              <a href={appHref(TRIANGLES_PATH)}>
                <strong>Triangles</strong>
                <span>Learn on a figure you can move</span>
              </a>
            </article>
          </div>
          <aside className="lesson-coach about-tutor">
            <div className="lesson-coach-content">
              <p className="lesson-coach-kicker">Your AI agent</p>
              <p className="lesson-coach-slide-count">With you as you learn</p>
              <div className="about-progress" aria-hidden="true">
                <span className="is-done" />
                <span className="is-done" />
                <span className="is-current" />
                <span />
                <span />
                <span />
                <span />
              </div>
              <p className="lesson-coach-topic">On the board</p>
              <h2>The lesson follows you</h2>
              <p>
                Ask for another explanation, a slower step, or a new topic. The
                board stays. The lesson changes.
              </p>
              <CodexPromptField
                id="about-move-prompt"
                placeholder="Ask for another explanation"
                submitName="Send prompt"
              />
            </div>
          </aside>
        </section>

        <section className="about-section">
          <h2>Learn here, not in a chat</h2>
          <div className="about-body">
            <p>
              You don&apos;t have to learn in a chat window, or watch a new
              canvas appear every time you ask a question.
            </p>
            <p>
              Chess and triangles already have a board built for them. You open
              it, and your AI agent teaches you there.
            </p>
            <p>
              Your AI agent does not invent a new screen. It uses the board in
              front of you.
            </p>
            <p>
              You choose what to do next. The board keeps the structure.
            </p>
          </div>
        </section>

        <section className="about-section">
          <h2>How it works</h2>
          <div className="about-steps">
            <article className="about-card">
              <div className="about-icon" aria-hidden="true">
                <svg viewBox="0 0 48 48">
                  <path fill="#9b74d8" d="M10 8h28v8H10z" />
                  <path fill="#7c4dcc" d="M10 20h28v8H10z" />
                  <path fill="#4a2a72" d="M10 32h28v8H10z" />
                </svg>
              </div>
              <h3>Open a board</h3>
              <p>
                Chess or Triangles is already set up for the subject. You just
                start.
              </p>
            </article>
            <span className="about-step-arrow" aria-hidden="true">
              →
            </span>
            <article className="about-card">
              <div className="about-icon" aria-hidden="true">
                <svg viewBox="0 0 48 48">
                  <circle cx="24" cy="20" r="10" fill="#9b74d8" />
                  <rect x="10" y="28" width="28" height="12" rx="6" fill="#4a2a72" />
                  <circle cx="20" cy="18" r="2" fill="#fff" />
                  <circle cx="28" cy="18" r="2" fill="#fff" />
                </svg>
              </div>
              <h3>Ask for a lesson</h3>
              <p>
                Tell your AI agent what you want to learn. It shows the idea on
                the board and explains as you go.
              </p>
            </article>
            <span className="about-step-arrow" aria-hidden="true">
              →
            </span>
            <article className="about-card">
              <div className="about-icon" aria-hidden="true">
                <svg viewBox="0 0 48 48">
                  <path
                    fill="#7c4dcc"
                    d="M8 24h14v4H8zm18-10l14 10-14 10v-6H22v-8h4z"
                  />
                </svg>
              </div>
              <h3>You choose the path</h3>
              <p>
                Slow down, skip ahead, or change topic. The same board stays
                with you.
              </p>
            </article>
          </div>
        </section>

        <section className="about-section">
          <h2>Stay on the same board</h2>
          <div className="about-compare">
            <div className="about-compare-col">
              <h3>In a chat</h3>
              <div className="about-flow">
                <span className="about-chip">Chat</span>
                <span aria-hidden="true">→</span>
                <span className="about-ghost">A new canvas</span>
                <span aria-hidden="true">→</span>
                <span className="about-ghost">Another canvas</span>
                <span aria-hidden="true">→</span>
                <span className="about-ghost">Another canvas</span>
              </div>
            </div>
            <div className="about-compare-col">
              <h3>On your board</h3>
              <div className="about-flow">
                <span className="about-chip">You ask</span>
                <span aria-hidden="true">→</span>
                <span className="about-chip about-chip-board">
                  <MiniSurface />
                  Same board, new lesson
                </span>
                <span aria-hidden="true">→</span>
                <span className="about-chip">The lesson follows you</span>
              </div>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2>You and your AI agent share this board</h2>
          <div className="about-shared">
            <div className="about-shared-actor" aria-hidden="true">
              <svg viewBox="0 0 48 48">
                <circle cx="24" cy="16" r="8" fill="#7c4dcc" />
                <path fill="#7c4dcc" d="M8 42c2-10 10-16 16-16s14 6 16 16" />
              </svg>
              <span>You</span>
            </div>
            <span className="about-shared-arrows" aria-hidden="true">
              ↔
            </span>
            <div className="about-shared-board">
              <LogoMark />
              <MiniSurface />
            </div>
            <span className="about-shared-arrows" aria-hidden="true">
              ↔
            </span>
            <div className="about-shared-actor" aria-hidden="true">
              <svg viewBox="0 0 48 48">
                <circle cx="24" cy="20" r="10" fill="#9b74d8" />
                <rect x="10" y="28" width="28" height="12" rx="6" fill="#4a2a72" />
                <circle cx="20" cy="18" r="2" fill="#fff" />
                <circle cx="28" cy="18" r="2" fill="#fff" />
              </svg>
              <span>Your AI agent</span>
            </div>
          </div>
          <p className="about-footnote">
            The lesson lives on the board in front of you, not in a throwaway
            chat.
          </p>
        </section>

        <section className="about-section">
          <h2>Choose a subject</h2>
          <div className="about-subjects">
            <a className="about-subject is-active" href={appHref(CHESS_PATH)}>
              <img src={pieceSrc("knight_w")} alt="" />
              <strong>Chess</strong>
              <span>Open the chessboard</span>
            </a>
            <a className="about-subject is-active" href={appHref(TRIANGLES_PATH)}>
              <span className="about-subject-icon">△</span>
              <strong>Triangles</strong>
              <span>Open the canvas</span>
            </a>
            <div className="about-subject is-soon">
              <span className="about-subject-icon">⎋</span>
              <strong>Circuits</strong>
              <span>Coming later</span>
            </div>
            <div className="about-subject is-soon">
              <span className="about-subject-icon">⬡</span>
              <strong>Chemistry</strong>
              <span>Coming later</span>
            </div>
            <div className="about-subject is-soon">
              <span className="about-subject-icon">♩</span>
              <strong>Music</strong>
              <span>Coming later</span>
            </div>
            <div className="about-subject is-soon">
              <span className="about-subject-icon">◎</span>
              <strong>Maps</strong>
              <span>Coming later</span>
            </div>
          </div>
          <p className="about-footnote">
            Chess and Triangles are ready. More subjects later.
          </p>
        </section>
      </main>

      <footer className="about-footer">
        <div className="about-footer-brand">
          <LogoMark />
          <div>
            <strong>Generative Learning</strong>
            <p>
              We build the learning surface once. Your AI agent personalizes the lesson endlessly.
            </p>
          </div>
        </div>
        <div className="about-footer-meta">
          <a
            className="about-footer-github"
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <GitHubIcon />
            GitHub
          </a>
          <p className="about-footer-credit">Powered by WebMCP</p>
        </div>
      </footer>
    </div>
  );
}
