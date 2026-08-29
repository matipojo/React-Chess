import './App.css';
import ModelContextBanner from './components/ModelContextBanner/ModelContextBanner';
import Referee from './components/Referee/Referee';

function App() {
  return (
    <div className="page-root">
      <ModelContextBanner />
      <Referee/>
    </div>
  );
}

export default App;
