import { FormEvent, useState } from "react";
import Chessboard from "../Chessboard/Chessboard";
import { boardFromFen } from "../../utils/board-setup";
import { copyPlainText } from "../../lessons/waitForUser";
import {
  ABOUT_EXAMPLE_PROMPTS,
  ITALIAN_GAME_ARROWS,
  ITALIAN_GAME_FEN,
} from "./aboutDemo";
import { ABOUT_HASH, PLAY_HASH } from "../../utils/appRoute";
import {
  buildCodexPromptHref,
  CODEX_UNAVAILABLE_MESSAGE,
  isCodexHost,
  openCodexPrompt,
  sharePromptWithHost,
} from "../../utils/codexPrompt";
import "../LessonCoach/LessonCoach.css";
import "../../board-themes.css";
import "./AboutPage.css";

const italianBoard = boardFromFen(ITALIAN_GAME_FEN, true);

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
          <button
            key={prompt}
            type="button"
            className="about-example"
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
              }, 2500);
            }}
          >
            {copiedId === prompt ? "Copied" : prompt}
          </button>
        )
      )}
      {status ? (
        <p className="about-prompt-status" role="status">
          {status}
        </p>
      ) : null}
    </div>
  );
}

function MiniBoard() {
  const dark = [false, true, false, true, true, false, true, false];
  return (
    <div className="about-mini-board" aria-hidden="true">
      {dark.map((isDark, index) => (
        <span
          key={index}
          className={isDark ? "about-mini-dark" : "about-mini-light"}
        />
      ))}
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="about-page">
      <header className="about-header">
        <a className="about-brand" href={ABOUT_HASH}>
          <LogoMark />
          <span>Living Learning Surfaces</span>
        </a>
        <a className="about-header-link" href={PLAY_HASH}>
          Open the board
        </a>
      </header>

      <main>
        <section className="about-hero">
          <h1>
            Generate the learning. <span>Not the canvas.</span>
          </h1>
          <p className="about-lede">
            You decide what to learn, when to learn it, and how to learn it.
            Your AI teaches inside a persistent interactive surface.
          </p>
          <CodexPromptField
            id="about-hero-prompt"
            placeholder="What do you want to learn?"
            submitName="Start learning"
          />
          <ExamplePrompts />
        </section>

        <section className="about-demo" data-board-theme="purple" aria-label="Chess learning surface">
          <div className="about-demo-board">
            <Chessboard
              playMove={() => false}
              pieces={italianBoard.pieces}
              arrows={ITALIAN_GAME_ARROWS}
              locked
            />
          </div>
          <aside className="lesson-coach about-tutor">
            <div className="lesson-coach-content">
              <p className="lesson-coach-kicker">AI Tutor</p>
              <p className="lesson-coach-slide-count">Step 3 of 7</p>
              <div className="about-progress" aria-hidden="true">
                <span className="is-done" />
                <span className="is-done" />
                <span className="is-current" />
                <span />
                <span />
                <span />
                <span />
              </div>
              <p className="lesson-coach-topic">Italian Game</p>
              <h2>Develop the bishop</h2>
              <p>
                White develops the bishop to an active square and prepares to
                castle.
              </p>
              <ol className="about-moves">
                <li>1. e4 e5</li>
                <li>2. Nf3 Nc6</li>
                <li>3. Bc4</li>
              </ol>
              <CodexPromptField
                id="about-move-prompt"
                placeholder="Your move?"
                submitName="Send move"
              />
            </div>
          </aside>
        </section>

        <section className="about-section">
          <h2>How it works</h2>
          <div className="about-steps">
            <article className="about-card">
              <div className="about-icon about-icon-chat" aria-hidden="true">
                <svg viewBox="0 0 48 48">
                  <path
                    fill="#7c4dcc"
                    d="M8 10h32a4 4 0 014 4v18a4 4 0 01-4 4H20l-8 8v-8H8a4 4 0 01-4-4V14a4 4 0 014-4z"
                  />
                </svg>
              </div>
              <h3>You ask</h3>
              <p>You decide what to learn.</p>
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
              <h3>AI teaches on the surface</h3>
              <p>AI teaches inside the same interactive surface.</p>
            </article>
            <span className="about-step-arrow" aria-hidden="true">
              →
            </span>
            <article className="about-card">
              <div className="about-icon about-icon-piece" aria-hidden="true">
                <img src={pieceSrc("knight_w")} alt="" />
              </div>
              <h3>You learn by doing</h3>
              <p>You interact, experiment, and get feedback.</p>
            </article>
          </div>
        </section>

        <section className="about-section">
          <h2>One surface. Continuous learning.</h2>
          <div className="about-compare">
            <div className="about-compare-col">
              <h3>Typical AI</h3>
              <div className="about-flow">
                <span className="about-chip">Prompt</span>
                <span aria-hidden="true">→</span>
                <span className="about-ghost">New canvas</span>
                <span aria-hidden="true">→</span>
                <span className="about-ghost">New canvas</span>
                <span aria-hidden="true">→</span>
                <span className="about-ghost">New canvas</span>
              </div>
            </div>
            <div className="about-compare-col">
              <h3>Living Learning Surface</h3>
              <div className="about-flow">
                <span className="about-chip">Ask</span>
                <span aria-hidden="true">→</span>
                <span className="about-chip about-chip-board">
                  <MiniBoard />
                  Same surface evolves
                </span>
                <span aria-hidden="true">→</span>
                <span className="about-chip">Continue learning ∞</span>
              </div>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2>You and AI see the same learning surface</h2>
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
              <img src={pieceSrc("knight_w")} alt="" />
              <MiniBoard />
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
              <span>AI</span>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2>The pattern is broader</h2>
          <div className="about-subjects">
            <a className="about-subject is-active" href={PLAY_HASH}>
              <img src={pieceSrc("knight_w")} alt="" />
              <strong>Chess</strong>
              <span>Working demo. Available now.</span>
            </a>
            <div className="about-subject is-soon">
              <span className="about-subject-icon">△</span>
              <strong>Geometry</strong>
              <span>Coming later</span>
            </div>
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
            Possible applications — not announced products.
          </p>
        </section>
      </main>

      <footer className="about-footer">
        <div className="about-footer-brand">
          <LogoMark />
          <div>
            <strong>Living Learning Surfaces</strong>
            <p>
              Persistent interactive environments where AI teaches through the
              environment instead of regenerating it.
            </p>
          </div>
        </div>
        <p className="about-footer-credit">Powered by WebMCP</p>
      </footer>
    </div>
  );
}
