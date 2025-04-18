import React from 'react';
import { useNavigate } from 'react-router-dom';

interface GameOverModalProps {
  isOpen: boolean;
  winner: {
    name: string;
    gameStats: {
      dartsThrown: number;
      averagePerThrow: number;
      highestThrow: number;
      totalPoints: number;
    };
  };
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ isOpen, winner }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold text-center text-white mb-4">
          Game Over!
        </h2>
        <div className="text-center text-white mb-6">
          <p className="text-xl mb-4">{winner.name} wins!</p>
          <div className="space-y-2">
            <p>Darts thrown: {winner.gameStats.dartsThrown}</p>
            <p>Average: {winner.gameStats.averagePerThrow.toFixed(1)}</p>
            <p>Highest score: {winner.gameStats.highestThrow}</p>
          </div>
        </div>
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Play Again
          </button>
          <button
            onClick={() => navigate('/')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
}; 