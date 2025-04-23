import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { gameService } from '../../services/db/gameService';
import { Button } from '../common'; // Import the custom Button component
// Import icons used in PlayerScoreCard
import { HashtagIcon, AdjustmentsHorizontalIcon, ChartBarIcon, ArrowUpIcon } from '@heroicons/react/24/outline';

interface GameOverModalProps {
  isOpen: boolean;
  gameId: number;
  winner: {
    id: string | number;
    name: string;
    currentScore: number;
    gameStats: {
      dartsThrown: number;
      averagePerThrow: number;
      highestThrow: number;
    };
  };
  winningThrowId: number; // Add this new prop
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ isOpen, gameId, winner, winningThrowId }) => {
  const navigate = useNavigate();
  const [gameSaved, setGameSaved] = useState(false);

  if (!isOpen) return null;

  const saveGameToDatabase = async () => {
    try {
      // Parse the winner ID to ensure it's a number
      const winnerId = parseInt(winner.id.toString());
      console.log('Saving game with:', { gameId, winnerId, winningThrowId });

      if (!winnerId || isNaN(winnerId)) {
        throw new Error('Invalid winner ID');
      }

      // First end the game with both winner ID and winning throw
      await gameService.endGame(gameId, winnerId, winningThrowId);
      
      setGameSaved(true);
      toast.success('Game saved successfully!');
    } catch (error) {
      console.error('Error saving game:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save game');
    }
  };

  return (
    // Rely on fixed inset-0 to cover the viewport, remove w-screen/h-screen
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] backdrop-blur-sm">
      {/* Apply PlayerScoreCard styling: bg, border, rounded, shadow */}
      <div className="bg-gray-900/80 p-6 rounded-2xl border border-neon-blue shadow-neon-blue-active max-w-md w-full text-center text-gray-100">
        <h2 className="text-2xl font-bold mb-4">Game Over!</h2>
        <p className="text-xl mb-4">{winner.name} wins!</p>
        
        {/* Statistics Section - Centered and with icons */}
        <div className="mb-6 space-y-1 w-2/3 max-w-xs mx-auto"> {/* Center content with max-width and mx-auto */}
          {/* Darts Thrown */}
          <div className="flex justify-between items-center h-6 text-neon-blue"> {/* Apply neon-blue text color */}
            <div className="flex items-center gap-1.5">
              <AdjustmentsHorizontalIcon className="w-4 h-4 text-neon-blue/80" />
              <span>Darts:</span>
            </div>
            <span className="font-semibold">{winner.gameStats.dartsThrown}</span>
          </div>
          {/* Average per Throw */}
          <div className="flex justify-between items-center h-6 text-neon-blue"> {/* Apply neon-blue text color */}
            <div className="flex items-center gap-1.5">
              <ChartBarIcon className="w-4 h-4 text-neon-blue/80" />
              <span>Ø:</span>
            </div>
            <span className="font-semibold">{winner.gameStats.averagePerThrow.toFixed(1)}</span>
          </div>
          {/* Highest Throw */}
          <div className="flex justify-between items-center h-6 text-neon-blue"> {/* Apply neon-blue text color */}
            <div className="flex items-center gap-1.5">
              <ArrowUpIcon className="w-4 h-4 text-neon-blue/80" />
              <span>Highest:</span>
            </div>
            <span className="font-semibold">{winner.gameStats.highestThrow}</span>
          </div>
        </div>
        
        {!gameSaved ? (
          <div className="mb-4">
            {/* Use custom Button component */}
            <Button 
              onClick={saveGameToDatabase}
              variant="priority" // Use priority variant for saving
              fullWidth
              className="mb-4" // Add margin bottom
            >
              Spiel speichern
            </Button>
            <p className="text-yellow-400 text-sm">
              Speichere das Spiel, um die Spielerstatistiken zu aktualisieren.
            </p>
          </div>
        ) : (
          <div className="mb-4">
            <p className="text-green-400 mb-4">✓ Spiel gespeichert</p>
          </div>
        )}
        
        <div className="flex justify-center space-x-4">
          {/* Use custom Button component for Play Again */}
          <Button 
            onClick={() => window.location.reload()}
            variant="priority" // Priority for primary action
          >
            Play Again
          </Button>
          {/* Use custom Button component for Back to Menu */}
          <Button 
            onClick={() => navigate('/')}
            variant="secondary" // Secondary for navigation
          >
            Back to Menu
          </Button>
        </div>
      </div>
    </div>
  );
};