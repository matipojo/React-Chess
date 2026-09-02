import { SavedLesson } from "../../lessons/types";
import { AppRoute, appHref, CHESS_PATH, HOME_PATH, TRIANGLES_PATH } from "../../utils/appRoute";
import LessonCatalogMenu from "../LessonCatalogMenu/LessonCatalogMenu";
import LessonDebugConsole from "../LessonDebugConsole/LessonDebugConsole";

type Props = {
  area: Exclude<AppRoute, "about">;
  lessons: SavedLesson[];
  onOpenLesson: (id: string) => void;
  onRemoveLesson: (id: string) => void;
};

export default function AppHeader({
  area,
  lessons,
  onOpenLesson,
  onRemoveLesson,
}: Props) {
  return (
    <header className="app-header">
      <div className="app-header-nav">
        <h1 className="app-header-title">Generative Learning</h1>
        <nav className="area-switch" aria-label="Learning area">
          <a
            href={appHref(CHESS_PATH)}
            className={area === "chess" ? "area-switch-tab is-active" : "area-switch-tab"}
            aria-current={area === "chess" ? "page" : undefined}
          >
            Chess
          </a>
          <a
            href={appHref(TRIANGLES_PATH)}
            className={area === "triangles" ? "area-switch-tab is-active" : "area-switch-tab"}
            aria-current={area === "triangles" ? "page" : undefined}
          >
            Triangles
          </a>
        </nav>
        <a className="app-header-link" href={appHref(HOME_PATH)}>
          Home
        </a>
      </div>
      <div className="app-header-actions">
        <LessonCatalogMenu
          lessons={lessons}
          onOpen={onOpenLesson}
          onRemove={onRemoveLesson}
        />
        <LessonDebugConsole />
      </div>
    </header>
  );
}
