import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Players from './pages/Players';
import GameHost from './pages/GameHost';
import { SettingsProvider } from './contexts/SettingsContext';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <SettingsProvider>
      <Router>
        <Layout>
          <Toaster position="top-center" />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/game" element={<GameHost />} />
            <Route path="/game/:gameId" element={<GameHost />} />
            <Route path="/players" element={<Players />} />
            {/* Fallback für nicht gefundene Routen */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </SettingsProvider>
  );
}

export default App;