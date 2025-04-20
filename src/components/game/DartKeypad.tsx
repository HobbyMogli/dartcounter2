import React, { useState } from 'react';
import { colors } from '../../styles/theme/colors';

interface DartKeypadProps {
  onScore: (score: number, multiplier: number, targetNumber?: number, isBull?: boolean) => void;
  onUndo: () => void;
  showMultipliedValues: boolean;
}

export const DartKeypad: React.FC<DartKeypadProps> = ({ onScore, onUndo, showMultipliedValues }) => {
  const [multiplier, setMultiplier] = useState(1);

  const handleNumberClick = (number: number) => {
    onScore(number, multiplier, number);
    setMultiplier(1);
  };

  const handleMiss = () => {
    onScore(0, 1);
    setMultiplier(1);
  };

  const handleUndo = () => {
    onUndo();
    setMultiplier(1);
  };

  const handleDouble = () => {
    setMultiplier(prev => prev === 2 ? 1 : 2);
  };

  const handleTriple = () => {
    setMultiplier(prev => prev === 3 ? 1 : 3);
  };

  const handleBull = () => {
    onScore(25, multiplier === 2 ? 2 : 1, 25, true);
    setMultiplier(1);
  };

  // Create number grid (1-20)
  const numberGrid = Array.from({ length: 20 }, (_, i) => i + 1)
    .map((number) => (
      <div key={number} className="relative">
        <button
          className={`w-full h-full bg-dark-700/70 hover:bg-dark-600/70 backdrop-blur-md rounded-lg text-gray-100 p-4 text-xl font-bold transition-all duration-300 ${
            multiplier === 2 ? `border border-[${colors.darts.double}]` : 
            multiplier === 3 ? `border border-[${colors.darts.triple}]` : 
            'border border-gray-600'
          }`}
          style={{
            boxShadow: multiplier === 2 ? `inset 0 0 5px 0 ${colors.darts.double}` : 
                      multiplier === 3 ? `inset 0 0 8px 0 ${colors.darts.triple}` : 'none'
          }}
          onClick={() => handleNumberClick(number)}
        >
          <div className="relative w-full">
            <div className="text-center">{number}</div>
            {showMultipliedValues && multiplier > 1 && (
              <span className={`absolute right-0 top-1/2 -translate-y-1/2 text-sm ${
                multiplier === 2 ? `text-[${colors.darts.double}]` : 
                `text-[${colors.darts.triple}]`
              }`}>
                ({number * multiplier})
              </span>
            )}
          </div>
        </button>
      </div>
    ));

  return (
    <div className="grid grid-cols-5 gap-2 p-4 bg-dark-800/50 backdrop-blur-md rounded-lg">
      {/* Number grid */}
      <div className="col-span-5 grid grid-cols-5 gap-2">
        {numberGrid}
      </div>

      {/* Bottom row */}
      <div className="relative">
        <button
          className="w-full h-full bg-dark-700/70 hover:bg-dark-600/70 backdrop-blur-md border border-gray-600 rounded-lg text-gray-100 p-4 text-xl font-bold transition-colors"
          onClick={handleUndo}
        >
          Undo
        </button>
      </div>
      <div className="relative">
        <button
          className="w-full h-full bg-dark-700/70 hover:bg-dark-600/70 backdrop-blur-md border border-gray-600 rounded-lg text-gray-100 p-4 text-xl font-bold transition-colors"
          onClick={handleMiss}
        >
          Miss
        </button>
      </div>
      <div className="relative">
        <button
          className={`w-full h-full ${
            multiplier === 2 ? `bg-[${colors.darts.double}]` : 'bg-dark-700/70'
          } hover:brightness-90 backdrop-blur-md border border-[${colors.darts.double}] rounded-lg text-gray-100 p-4 text-xl font-bold transition-all duration-300`}
          style={{
            boxShadow: `inset 0 0 5px 0 ${colors.darts.double}`
          }}
          onClick={handleDouble}
        >
          Double
        </button>
      </div>
      <div className="relative">
        <button
          className={`w-full h-full ${
            multiplier === 3 ? `bg-[${colors.darts.triple}]` : 'bg-dark-700/70'
          } hover:brightness-90 backdrop-blur-md border border-[${colors.darts.triple}] rounded-lg text-gray-100 p-4 text-xl font-bold transition-all duration-300`}
          style={{
            boxShadow: `inset 0 0 8px 0 ${colors.darts.triple}`
          }}
          onClick={handleTriple}
        >
          Triple
        </button>
      </div>
      <div className="relative">
        <button
          className={`w-full h-full bg-dark-700/70 hover:bg-dark-600/70 backdrop-blur-md rounded-lg text-gray-100 p-4 text-xl font-bold transition-all duration-300 ${
            multiplier === 2 ? `border border-[${colors.darts.double}]` : 
            'border border-gray-600'
          }`}
          style={{
            boxShadow: multiplier === 2 ? `inset 0 0 5px 0 ${colors.darts.double}` : 'none'
          }}
          onClick={handleBull}
        >
          <div className="relative w-full">
            <div className="text-center">25</div>
            {showMultipliedValues && multiplier === 2 && (
              <span className={`absolute right-0 top-1/2 -translate-y-1/2 text-sm text-[${colors.darts.double}]`}>
                (50)
              </span>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}; 