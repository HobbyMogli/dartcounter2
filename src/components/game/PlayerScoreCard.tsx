import React from 'react';
import { useSettings } from '../../contexts/SettingsContext';

interface PlayerScoreCardProps {
  playerName: string;
  currentScore: number;
  lastThrows: (number | null)[];
  isActive: boolean;
  statistics: {
    average: number;
    dartsThrown: number;
    highestScore: number;
  };
}

const PlayerScoreCard: React.FC<PlayerScoreCardProps> = ({
  playerName,
  currentScore,
  lastThrows,
  isActive,
  statistics
}) => {
  const settings = useSettings();
  
  // Hilfsfunktion zum Formatieren der Würfe
  const formatThrow = (v: number | null) => {
    if (v === null) return '–';
    // Negative values indicate busted throws
    if (v < 0) return Math.abs(v);
    return v;
  };
  
  // Berechne die Summe der letzten Würfe
  const lastThrowSum = lastThrows.every(throw_ => throw_ !== null)
    ? lastThrows.reduce((sum, throw_) => sum + (throw_ === null ? 0 : Math.abs(throw_)), 0)
    : 0;

  return (
    <div className={`p-4 rounded-lg ${isActive ? 'bg-blue-600' : 'bg-gray-700'} transition-colors duration-300`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xl font-bold text-white">{playerName}</h3>
        <span className="text-2xl font-bold text-white">{currentScore}</span>
      </div>
      
      {settings.showThrowHistory && (
        <div className="mb-3">
          {/* Letzte Würfe */}
          <div className="grid grid-cols-3 gap-2 mb-1">
            {lastThrows.map((throw_, index) => (
              <div 
                key={index} 
                className={`bg-gray-800 p-2 rounded text-center text-white ${
                  throw_ === null ? 'opacity-50' : 
                  throw_ && throw_ < 0 ? 'text-red-500 line-through' : ''
                }`}
              >
                {formatThrow(throw_)}
              </div>
            ))}
          </div>
          {/* Summe der letzten Würfe */}
          {settings.showLastThrowSum && (
            <div className="text-right text-sm text-gray-300 pr-1">
              Summe: {lastThrowSum}
            </div>
          )}
        </div>
      )}
      
      {settings.showStatistics && (
        <div className="text-sm text-gray-200 space-y-1">
          <div className="flex justify-between">
            <span>Würfe:</span>
            <span>{statistics.dartsThrown}</span>
          </div>
          <div className="flex justify-between">
            <span>Ø pro Wurf:</span>
            <span>{statistics.average.toFixed(1)}</span>
          </div>
          <div className="flex justify-between">
            <span>Höchster Wurf:</span>
            <span>{statistics.highestScore}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerScoreCard; 