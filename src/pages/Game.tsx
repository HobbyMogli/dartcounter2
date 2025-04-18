import React, { useState, useEffect } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import type { GameSetupData } from '../types/gameTypes';
import PlayerScoreCard from '../components/game/PlayerScoreCard';
import { SettingsModal } from '../components/game-settings/SettingsModal';
import { playerService } from '../services/db';
import { gameService } from '../services/db/gameService';
import { Player } from '../services/db/types';
import { useSettings } from '../contexts/SettingsContext';
import { X01Game } from '../components/game/X01Game';

interface GameStatistics {
  dartsThrown: number;
  averagePerThrow: number;
  highestThrow: number;
  totalPoints: number;
}

interface PlayerGameState extends Player {
  currentScore: number;
  lastThrows: (number | null)[];
  gameStats: GameStatistics;
}

interface ThrowHistory {
  value: number;
  playerIndex: number;
}

const Game: React.FC = () => {
  const location = useLocation();
  const gameData = location.state as GameSetupData;
  const [players, setPlayers] = useState<PlayerGameState[]>([]);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [currentThrow, setCurrentThrow] = useState<number[]>([]);
  const [throwHistory, setThrowHistory] = useState<ThrowHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [gameId, setGameId] = useState<number | null>(null);
  const settings = useSettings();

  useEffect(() => {
    const initializeGame = async () => {
      if (gameData?.players) {
        try {
          // Load players
          const allPlayers = await playerService.getAllPlayers();
          const gamePlayers = allPlayers
            .filter(player => gameData.players.includes(player.id.toString()))
            .map(player => ({
              ...player,
              currentScore: gameData.settings.startScore || 501,
              lastThrows: [null, null, null],
              gameStats: {
                dartsThrown: 0,
                averagePerThrow: 0,
                highestThrow: 0,
                totalPoints: 0
              }
            }));
          setPlayers(gamePlayers);

          // Create a single game for the entire match
          const game = await gameService.createGame({
            playerIds: gamePlayers.map(player => parseInt(player.id.toString())),
            gameType: gameData.gameMode,
            startingScore: gameData.settings.startScore || 501,
            settings: gameData.settings
          });
          setGameId(game.id);
        } catch (error) {
          console.error('Fehler beim Initialisieren des Spiels:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    initializeGame();
  }, [gameData]);

  // Redirect wenn keine Spieldaten vorhanden sind
  if (!gameData) {
    return <Navigate to="/" replace />;
  }

  if (isLoading || !gameId) {
    return <div className="text-white text-center py-8">Lade Spielerdaten...</div>;
  }

  const handleThrow = (score: number, multiplier: number) => {
    const throwValue = score * multiplier;
    const newThrow = [...currentThrow, throwValue];
    setCurrentThrow(newThrow);

    // Add throw to history
    setThrowHistory([...throwHistory, { value: throwValue, playerIndex: activePlayerIndex }]);

    // Update current player's displayed throws and stats
    const updatedPlayers = [...players];
    const currentPlayer = updatedPlayers[activePlayerIndex];
    
    // Update throws display - fill from left to right
    const lastThrows = [...currentPlayer.lastThrows];
    lastThrows[newThrow.length - 1] = throwValue;
    currentPlayer.lastThrows = lastThrows;

    // Update game statistics
    currentPlayer.gameStats.dartsThrown += 1;
    currentPlayer.gameStats.totalPoints += throwValue;
    currentPlayer.currentScore -= throwValue;

    if (newThrow.length === 3) {
      // Calculate throw sum for this round
      const throwSum = newThrow.reduce((a, b) => a + b, 0);
      
      // Update highest throw if current throw sum is higher
      if (throwSum > currentPlayer.gameStats.highestThrow) {
        currentPlayer.gameStats.highestThrow = throwSum;
      }
      
      // Calculate new average
      const numberOfRounds = Math.floor(currentPlayer.gameStats.dartsThrown / 3);
      currentPlayer.gameStats.averagePerThrow = numberOfRounds > 0 
        ? currentPlayer.gameStats.totalPoints / numberOfRounds
        : 0;
      
      // Move to next player and reset current throw
      setActivePlayerIndex((activePlayerIndex + 1) % players.length);
      setCurrentThrow([]);

      // Reset next player's lastThrows
      const nextPlayer = updatedPlayers[(activePlayerIndex + 1) % players.length];
      nextPlayer.lastThrows = [null, null, null];
    }

    setPlayers(updatedPlayers);
  };

  const handleUndo = () => {
    if (throwHistory.length === 0) return;

    // Get the last throw from history
    const lastThrow = throwHistory[throwHistory.length - 1];
    const playerToUndo = lastThrow.playerIndex;
    
    const updatedPlayers = [...players];
    const playerState = updatedPlayers[playerToUndo];

    // If we're undoing a throw from the previous player
    if (playerToUndo !== activePlayerIndex) {
      // Switch back to the previous player
      setActivePlayerIndex(playerToUndo);
      // Get the number of non-null throws to determine the current position
      const throwCount = playerState.lastThrows.filter(t => t !== null).length;
      // Set current throw array to the remaining throws
      setCurrentThrow(playerState.lastThrows.filter(t => t !== null).slice(0, throwCount - 1));
    } else {
      // Remove last throw from current sequence
      setCurrentThrow(currentThrow.slice(0, -1));
    }

    // Update throws display - always maintain only 3 slots
    const lastThrows: (number | null)[] = [null, null, null];
    // Get remaining throws after removing the last one
    const remainingThrows = playerState.lastThrows.filter(t => t !== null).slice(0, -1);
    // Fill from left to right
    for (let i = 0; i < remainingThrows.length; i++) {
      lastThrows[i] = remainingThrows[i] || null;
    }
    playerState.lastThrows = lastThrows;

    // Update game statistics
    playerState.gameStats.dartsThrown -= 1;
    playerState.gameStats.totalPoints -= lastThrow.value;
    playerState.currentScore += lastThrow.value;

    // Remove the throw from history
    setThrowHistory(throwHistory.slice(0, -1));
    setPlayers(updatedPlayers);
  };

  const handleGameEnd = (score: number) => {
    // Handle game end logic here
    console.log('Game ended with score:', score);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {players.map((player, index) => (
          <PlayerScoreCard
            key={player.id}
            playerName={player.name}
            currentScore={player.currentScore}
            lastThrows={player.lastThrows}
            isActive={index === activePlayerIndex}
            statistics={{
              average: player.gameStats.averagePerThrow,
              dartsThrown: player.gameStats.dartsThrown,
              highestScore: player.gameStats.highestThrow
            }}
          />
        ))}
      </div>
      <X01Game
        initialScore={gameData.settings.startScore || 501}
        playerId={parseInt(players[activePlayerIndex]?.id.toString())}
        gameId={gameId}
        onGameEnd={handleGameEnd}
        gameSettings={gameData.settings}
        onThrow={handleThrow}
        onUndo={handleUndo}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default Game;
