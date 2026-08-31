import './App.css';
import './board-themes.css';
import ChangeBackgroundButton from './components/ChangeBackgroundButton/ChangeBackgroundButton';
import ModelContextBanner from './components/ModelContextBanner/ModelContextBanner';
import Referee from './components/Referee/Referee';
import { BoardThemeProvider, useBoardTheme } from './hooks/useBoardTheme';
import { cssBackgroundImage } from './utils/pageBackground';

function AppShell() {
  const { theme, customBackground } = useBoardTheme();

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
      <Referee />
      <ChangeBackgroundButton />
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
