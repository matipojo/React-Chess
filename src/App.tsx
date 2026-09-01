import './App.css';
import './board-themes.css';
import AboutPage from './components/AboutPage/AboutPage';
import BoardThemePicker from './components/BoardThemePicker/BoardThemePicker';
import ChangeBackgroundButton from './components/ChangeBackgroundButton/ChangeBackgroundButton';
import ModelContextBanner from './components/ModelContextBanner/ModelContextBanner';
import Referee from './components/Referee/Referee';
import TriangleSurface from './components/TriangleSurface/TriangleSurface';
import { BoardThemeProvider, useBoardTheme } from './hooks/useBoardTheme';
import { useAppRoute } from './hooks/useAppRoute';
import { cssBackgroundImage } from './utils/pageBackground';

function AppShell() {
  const { theme, customBackground } = useBoardTheme();
  const route = useAppRoute();

  if (route === "about") {
    return <AboutPage />;
  }

  return (
    <div
      className="page-root"
      data-board-theme={theme}
      data-custom-bg={customBackground ? "true" : undefined}
      style={
        customBackground
          ? { backgroundImage: cssBackgroundImage(customBackground) }
          : undefined
      }
    >
      <ModelContextBanner />
      {route === "triangles" ? <TriangleSurface /> : <Referee />}
      <div className="page-chrome">
        <BoardThemePicker />
        <ChangeBackgroundButton />
      </div>
    </div>
  );
}

function App() {
  return (
    <BoardThemeProvider>
      <AppShell />
    </BoardThemeProvider>
  );
}

export default App;
