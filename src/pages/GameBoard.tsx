import React, { useState, useEffect } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { DartKeypad } from '../components/game/DartKeypad';
import PlayerScoreCard from '../components/game/PlayerScoreCard';
import type { GameSetupData } from '../types/gameTypes';
import { useSettings } from '../contexts/SettingsContext';

interface PlayerState {
  name: string;
  currentScore: number;
  lastThrows: number[];
  statistics: {
    average: number;
    dartsThrown: number;
    highestScore: number;
  };
}

const GameBoard: React.FC = () => {
  const location = useLocation();
  const gameData = location.state as GameSetupData;
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [currentThrow, setCurrentThrow] = useState<number[]>([]);
  const settings = useSettings();

  useEffect(() => {
    if (gameData?.players) {
      // Initialisiere Spielerdaten
      const initialPlayers: PlayerState[] = gameData.players.map(name => ({
        name,
        currentScore: gameData.settings.startScore || 501,
        lastThrows: [],
        statistics: {
          average: 0,
          dartsThrown: 0,
          highestScore: 0
        }
      }));
      setPlayers(initialPlayers);
    }
  }, [gameData]);

  if (!gameData) {
    return <Navigate to="/" replace />;
  }

  const handleScore = (score: number) => {
    const newThrow = [...currentThrow, score];
    
    if (newThrow.length === 3) {
      // Update player score and statistics
      const playersCopy = [...players];
      const currentPlayer = playersCopy[activePlayerIndex];
      
      // Update score
      const throwSum = newThrow.reduce((a, b) => a + b, 0);
      currentPlayer.currentScore -= throwSum;
      
      // Update statistics
      currentPlayer.lastThrows = newThrow;
      currentPlayer.statistics.average = 
        ((currentPlayer.statistics.average * currentPlayer.statistics.dartsThrown) + throwSum) / (currentPlayer.statistics.dartsThrown + 1);
      currentPlayer.statistics.dartsThrown += 1;
      currentPlayer.statistics.highestScore = Math.max(currentPlayer.statistics.highestScore, throwSum);
      
      // Move to next player
      setPlayers(playersCopy);
      setActivePlayerIndex((activePlayerIndex + 1) % players.length);
      setCurrentThrow([]);
    } else {
      setCurrentThrow(newThrow);
    }
  };

  const handleUndo = () => {
    if (currentThrow.length === 0) return;
    
    const newThrow = currentThrow.slice(0, -1);
    setCurrentThrow(newThrow);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Player Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {players.map((player, index) => (
          <PlayerScoreCard
            key={player.name}
            playerName={player.name}
            currentScore={player.currentScore}
            lastThrows={player.lastThrows}
            isActive={index === activePlayerIndex}
            statistics={player.statistics}
          />
        ))}
      </div>

      {/* Current Throw Display */}
      <div className="bg-gray-800 p-4 rounded-lg mb-8">
        <h3 className="text-white mb-2">Current Throw</h3>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="bg-gray-700 p-4 rounded text-center text-white"
            >
              {currentThrow[i] !== undefined ? currentThrow[i] : '-'}
            </div>
          ))}
        </div>
      </div>

      {/* Dart Keypad */}
      <DartKeypad 
        onScore={handleScore}
        onUndo={handleUndo}
        showMultipliedValues={settings.showMultipliedValues}
      />
    </div>
  );
};

export default GameBoard;