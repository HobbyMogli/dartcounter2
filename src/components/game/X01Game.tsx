import React, { useState } from 'react';
import { DartKeypad } from './DartKeypad';
import { gameService, GameState } from '../../services/db/gameService';
import { useSettings } from '../../contexts/SettingsContext';

interface X01GameProps {
  initialScore: number;
  playerId: number;
  gameId: number;
  onGameEnd: (score: number) => void;
  gameSettings: any;
  onThrow?: (score: number, multiplier: number) => void;
  onUndo?: () => void;
}

export const X01Game: React.FC<X01GameProps> = ({
  initialScore,
  playerId,
  gameId,
  onGameEnd,
  gameSettings,
  onThrow,
  onUndo: parentOnUndo
}) => {
  const [gameState, setGameState] = useState<GameState>({
    currentScore: initialScore,
    dartsThrown: 0,
    round: 1,
    currentDart: 1,
    lastThrows: []
  });
  const settings = useSettings();

  const handleScore = async (score: number, multiplier: number, targetNumber?: number, isBull: boolean = false) => {
    try {
      const throwData = await gameService.registerThrow({
        gameId,
        playerId,
        roundNumber: gameState.round,
        dartNumber: gameState.currentDart,
        score: score * multiplier,
        multiplier,
        targetNumber,
        isBull
      });

      // Update game state
      const newState: GameState = {
        currentScore: gameState.currentScore - (score * multiplier),
        dartsThrown: gameState.dartsThrown + 1,
        round: gameState.currentDart === 3 ? gameState.round + 1 : gameState.round,
        currentDart: gameState.currentDart === 3 ? 1 : gameState.currentDart + 1,
        lastThrows: [throwData, ...gameState.lastThrows]
      };
      setGameState(newState);

      // Notify parent component about the throw
      if (onThrow) {
        onThrow(score, multiplier);
      }

      // Check if game is over
      if (newState.currentScore === 0) {
        await gameService.endGame(gameId, newState.currentScore, newState.dartsThrown);
        onGameEnd(newState.currentScore);
      }
    } catch (error) {
      console.error('Error recording throw:', error);
    }
  };

  const handleUndo = async () => {
    if (gameState.lastThrows.length === 0) return;

    try {
      const lastThrow = gameState.lastThrows[0];
      const result = await gameService.undoLastThrow(lastThrow.id);
      
      if (result.success) {
        // Update game state
        const newState: GameState = {
          currentScore: gameState.currentScore + lastThrow.score,
          dartsThrown: gameState.dartsThrown - 1,
          round: gameState.currentDart === 1 ? gameState.round - 1 : gameState.round,
          currentDart: gameState.currentDart === 1 ? 3 : gameState.currentDart - 1,
          lastThrows: gameState.lastThrows.slice(1)
        };
        setGameState(newState);

        // Notify parent about undo
        if (parentOnUndo) {
          parentOnUndo();
        }
      }
    } catch (error) {
      console.error('Error undoing throw:', error);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <DartKeypad
        onScore={handleScore}
        onUndo={handleUndo}
        showMultipliedValues={settings.showMultipliedValues}
      />
    </div>
  );
}; 