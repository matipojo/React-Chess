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
            Build the learning surface once. Personalize the lesson endlessly.
          </p>
          <h1>
            Generate the learning. <span>Not the canvas.</span>
          </h1>
          <p className="about-lede">
            We build the learning environment once, and let AI generate the
            lesson inside it. Instead of a generic one-off canvas, learners get
            a professional, persistent surface tailored to the subject.
          </p>
          <p className="about-lede about-lede-more">
            AI personalizes the lesson to how each person learns and guides them
            through it in real time. The learner chooses the path, while the
            environment provides the structure — with teacher guidance and
            measurable progress as a future layer.
          </p>
          <CodexPromptField
            id="about-hero-prompt"
            placeholder="What do you want to learn?"
            submitName="Start learning"
          />
          <ExamplePrompts />
        </section>

        <section className="about-demo" data-board-theme="purple" aria-label="Example learning surfaces">
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
                <span>A surface built for the subject</span>
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
                <span>Tools already in place</span>
              </a>
            </article>
          </div>
          <aside className="lesson-coach about-tutor">
            <div className="lesson-coach-content">
              <p className="lesson-coach-kicker">AI Tutor</p>
              <p className="lesson-coach-slide-count">Guiding in real time</p>
              <div className="about-progress" aria-hidden="true">
                <span className="is-done" />
                <span className="is-done" />
                <span className="is-current" />
                <span />
                <span />
                <span />
                <span />
              </div>
              <p className="lesson-coach-topic">Inside the surface</p>
              <h2>The lesson is personalized</h2>
              <p>
                The AI doesn&apos;t build the interface — it creates the lesson
                inside it, then adapts pace, explanations, and practice to each
                learner.
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
          <h2>A different approach</h2>
          <p className="about-body">
            Most AI learning today happens in a chat or a generic canvas created
            on the fly. We take a different approach: we provide a professional,
            persistent learning surface built for the subject, with the right
            tools already in place. The AI doesn&apos;t build the interface — it
            creates the lesson inside it, personalizes the pace, explanations
            and practice to each learner, and guides the experience in real
            time. The learner chooses the path, while the learning environment
            can provide the structure. In the future, the same shared surface
            could also let teachers define learning units and measure whether
            each learner actually reached the required outcome.
          </p>
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
              <h3>Build the surface once</h3>
              <p>
                A professional, persistent environment tailored to the subject,
                with the right tools already in place.
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
              <h3>AI generates the lesson</h3>
              <p>
                The AI creates the lesson inside the surface and personalizes
                pace, explanations, and practice in real time.
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
                The learner chooses what to do next, while the environment
                provides the structure.
              </p>
            </article>
          </div>
        </section>

        <section className="about-section">
          <h2>Not a chat. Not a throwaway canvas.</h2>
          <div className="about-compare">
            <div className="about-compare-col">
              <h3>Typical AI</h3>
              <div className="about-flow">
                <span className="about-chip">Chat</span>
                <span aria-hidden="true">→</span>
                <span className="about-ghost">Generic canvas</span>
                <span aria-hidden="true">→</span>
                <span className="about-ghost">New canvas</span>
                <span aria-hidden="true">→</span>
                <span className="about-ghost">New canvas</span>
              </div>
            </div>
            <div className="about-compare-col">
              <h3>Generative Learning</h3>
              <div className="about-flow">
                <span className="about-chip">Ask</span>
                <span aria-hidden="true">→</span>
                <span className="about-chip about-chip-board">
                  <MiniSurface />
                  Same surface, new lesson
                </span>
                <span aria-hidden="true">→</span>
                <span className="about-chip">Personalized endlessly</span>
              </div>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2>One shared surface</h2>
          <div className="about-shared">
            <div className="about-shared-actor" aria-hidden="true">
              <svg viewBox="0 0 48 48">
                <circle cx="24" cy="16" r="8" fill="#7c4dcc" />
                <path fill="#7c4dcc" d="M8 42c2-10 10-16 16-16s14 6 16 16" />
              </svg>
              <span>Learner</span>
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
              <span>AI</span>
            </div>
          </div>
          <p className="about-footnote">
            Later, teachers could define learning units on this same surface and
            measure whether each learner reached the required outcome.
          </p>
        </section>

        <section className="about-section">
          <h2>Surfaces built for the subject</h2>
          <div className="about-subjects">
            <a className="about-subject is-active" href={appHref(CHESS_PATH)}>
              <img src={pieceSrc("knight_w")} alt="" />
              <strong>Chess</strong>
              <span>Working demo. Available now.</span>
            </a>
            <a className="about-subject is-active" href={appHref(TRIANGLES_PATH)}>
              <span className="about-subject-icon">△</span>
              <strong>Triangles</strong>
              <span>Working demo. Available now.</span>
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
            Possible applications — not announced products.
          </p>
        </section>
      </main>

      <footer className="about-footer">
        <div className="about-footer-brand">
          <LogoMark />
          <div>
            <strong>Generative Learning</strong>
            <p>
              Build the learning surface once. Personalize the lesson endlessly.
            </p>
          </div>
        </div>
        <p className="about-footer-credit">Powered by WebMCP</p>
      </footer>
    </div>
  );
}
