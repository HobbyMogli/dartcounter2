import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import GameSetup from './pages/GameSetup';
import GameBoard from './pages/GameBoard';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/setup" element={<GameSetup />} />
          <Route path="/game" element={<GameBoard />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
