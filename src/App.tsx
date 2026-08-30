import './App.css';
import './board-themes.css';
import ModelContextBanner from './components/ModelContextBanner/ModelContextBanner';
import Referee from './components/Referee/Referee';
import { BoardThemeProvider, useBoardTheme } from './hooks/useBoardTheme';

function AppShell() {
  const { theme } = useBoardTheme();

  return (
    <div className="page-root" data-board-theme={theme}>
      <ModelContextBanner />
      <Referee />
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
