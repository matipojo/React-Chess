import { SavedLesson } from "../../lessons/types";
import { detectTextDirection } from "../../utils/text-direction";
import "./LessonCatalogMenu.css";

type Props = {
  lessons: SavedLesson[];
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
};

export default function LessonCatalogMenu({ lessons, onOpen, onRemove }: Props) {
  return (
    <div className="lesson-catalog-bar">
      <details className="lesson-catalog">
        <summary className="lesson-catalog-toggle">
          My lessons
          <span className="lesson-catalog-count">{lessons.length}</span>
        </summary>
        <ul className="lesson-catalog-list">
          {lessons.length === 0 && (
            <li className="lesson-catalog-empty">No saved lessons yet.</li>
          )}
          {lessons.map((lesson) => (
            <li key={lesson.id} className="lesson-catalog-item">
              <button
                type="button"
                className="lesson-catalog-open"
                dir={detectTextDirection(lesson.title).dir}
                onClick={(event) => {
                  const details = event.currentTarget.closest("details");
                  if (details) {
                    details.removeAttribute("open");
                  }
                  onOpen(lesson.id);
                }}
              >
                <span className="lesson-catalog-title">{lesson.title}</span>
                <span className="lesson-catalog-kind" dir="ltr">
                  {lesson.kind}
                </span>
              </button>
              <button
                type="button"
                className="lesson-catalog-remove"
                aria-label={`Remove ${lesson.title}`}
                onClick={() => onRemove(lesson.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
