import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import GameSetup from './pages/GameSetup';
import GameBoard from './pages/GameBoard';
import Players from './pages/Players';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/setup" element={<GameSetup />} />
          <Route path="/game" element={<GameBoard />} />
          <Route path="/players" element={<Players />} />
          {/* Fallback für nicht gefundene Routen */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;