import { useMemo, useState } from "react";
import { useLessonDebugLog } from "../../hooks/useLessonDebugLog";
import {
  clearLessonDebugLog,
  DebugKind,
  lessonDebugLogAsJson,
} from "../../lessons/debugLog";
import "./LessonDebugConsole.css";

const FILTERS: { id: DebugKind | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "tool", label: "Tools" },
  { id: "user-move", label: "Moves" },
  { id: "visual", label: "Visual" },
];

export default function LessonDebugConsole() {
  const events = useLessonDebugLog();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<DebugKind | "all">("all");
  const [copied, setCopied] = useState(false);

  const visible = useMemo(() => {
    const list = filter === "all" ? events : events.filter((event) => event.kind === filter);
    return list.slice().reverse();
  }, [events, filter]);

  async function copyLog() {
    const text = lessonDebugLogAsJson();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy lesson debug log", text);
    }
  }

  return (
    <div className={`lesson-debug ${open ? "lesson-debug-open" : ""}`}>
      <button
        type="button"
        className="lesson-debug-toggle"
        onClick={() => setOpen((value) => !value)}
      >
        Debug
        {events.length > 0 && <span className="lesson-debug-count">{events.length}</span>}
      </button>
      {open && (
        <div className="lesson-debug-panel" role="dialog" aria-label="Lesson debug console">
          <div className="lesson-debug-toolbar">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={filter === item.id ? "is-active" : ""}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
            <button type="button" onClick={copyLog}>
              {copied ? "Copied" : "Copy JSON"}
            </button>
            <button type="button" onClick={() => clearLessonDebugLog()}>
              Clear
            </button>
          </div>
          <ol className="lesson-debug-list">
            {visible.length === 0 && (
              <li className="lesson-debug-empty">No events yet. Teach, move, or annotate.</li>
            )}
            {visible.map((event) => (
              <li key={event.id} className={`lesson-debug-item kind-${event.kind}`}>
                <div className="lesson-debug-meta">
                  <span className="lesson-debug-kind">{event.kind}</span>
                  <span className="lesson-debug-name">{event.name}</span>
                  <span className="lesson-debug-time">
                    {new Date(event.t).toLocaleTimeString()}
                  </span>
                </div>
                <pre>{JSON.stringify(event.detail, null, 2)}</pre>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
