import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Players from './pages/Players';
import GameHost from './pages/GameHost';
import ApiTest from './pages/ApiTest';
import DatabaseDebug from './pages/DatabaseDebug';
import { SettingsProvider } from './contexts/SettingsContext';
import { SpecialThrowProvider } from './contexts/SpecialThrowContext';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <SettingsProvider>
      <SpecialThrowProvider>
        <Router>
          <Layout>
            <Toaster position="top-center" />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/game" element={<GameHost />} />
              <Route path="/game/:gameId" element={<GameHost />} />
              <Route path="/players" element={<Players />} />
              <Route path="/api-test" element={<ApiTest />} />
              <Route path="/db-debug" element={<DatabaseDebug />} />
              {/* Fallback für nicht gefundene Routen */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </Router>
      </SpecialThrowProvider>
    </SettingsProvider>
  );
}

export default App;