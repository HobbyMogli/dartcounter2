import React, { useState } from 'react';
import { colors } from '../../styles/theme/colors';
import { ArrowUturnLeftIcon } from '@heroicons/react/24/outline';

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
          className={`w-full h-16 bg-dark-700/70 hover:bg-dark-600/70 backdrop-blur-md rounded-lg text-gray-100 p-2 text-xl font-bold transition-shadow duration-150 ease-in-out flex flex-col items-center justify-center
            ${
              multiplier === 2 ? 'border border-darts-double' : 
              multiplier === 3 ? 'border border-darts-triple' : 
              'border border-gray-500'
            }
            ${
              multiplier === 3 ? 'shadow-inset-darts-triple' :
              multiplier === 2 ? 'shadow-inset-darts-double' :
              'shadow-inset-neon-blue'
            }
          `}
          onClick={() => handleNumberClick(number)}
        >
          <div className="text-center transition-transform duration-200 ease-in-out">{number}</div>
          <span className={`text-xs mt-0.5 overflow-hidden transition-all duration-200 ease-in-out 
            ${showMultipliedValues && multiplier > 1 ? 'opacity-100 max-h-4' : 'opacity-0 max-h-0'}
            ${
              multiplier === 2 ? 'text-darts-double' : 'text-darts-triple'
            }
          `}>
            ({number * multiplier})
          </span>
        </button>
      </div>
    ));

  return (
    <div className="grid grid-cols-5 gap-2 p-4 bg-gray-900/70 backdrop-blur-sm border border-neon-blue rounded-2xl shadow-neon-blue-inactive">
      {/* Number grid */}
      <div className="col-span-5 grid grid-cols-5 gap-2">
        {numberGrid}
      </div>

      {/* Bottom row */}
      <div className="relative">
        <button
          className={`w-full h-16 bg-[${colors.warning.light}] hover:brightness-90 backdrop-blur-md border border-[${colors.warning.light}] rounded-lg text-gray-100 p-4 text-xl font-bold transition-all duration-300 flex items-center justify-center`}
          style={{
            boxShadow: `inset 0 0 12px 1px ${colors.warning.light}`
          }}
          onClick={handleUndo}
        >
          <ArrowUturnLeftIcon className="w-6 h-6" />
        </button>
      </div>
      <div className="relative">
        <button
          className={`w-full h-16 bg-[${colors.warning.dark}] hover:brightness-95 backdrop-blur-md border border-[${colors.warning.dark}] rounded-lg text-gray-100 p-4 text-xl font-bold transition-all duration-300 flex items-center justify-center`}
          style={{
            boxShadow: `inset 0 0 12px 1px ${colors.warning.dark}`
          }}
          onClick={handleMiss}
        >
          Miss
        </button>
      </div>
      <div className="relative">
        <button
          className={`w-full h-16 ${
            multiplier === 2 ? `bg-[${colors.darts.double}]` : 'bg-dark-700/70'
          } hover:brightness-90 backdrop-blur-md border border-[${colors.darts.double}] rounded-lg text-gray-100 p-4 text-xl font-bold transition-all duration-300 flex items-center justify-center`}
          style={{
            boxShadow: multiplier === 2 ? `inset 0 0 16px 4px ${colors.darts.double}` : 
                      `inset 0 0 12px 5px ${colors.darts.double}80`
          }}
          onClick={handleDouble}
        >
          Double
        </button>
      </div>
      <div className="relative">
        <button
          className={`w-full h-16 ${
            multiplier === 3 ? `bg-[${colors.darts.triple}]` : 'bg-dark-700/70'
          } hover:brightness-90 backdrop-blur-md border border-[${colors.darts.triple}] rounded-lg text-gray-100 p-4 text-xl font-bold transition-all duration-300 flex items-center justify-center`}
          style={{
            boxShadow: multiplier === 3 ? `inset 0 0 16px 4px ${colors.darts.triple}` : 
                      `inset 0 0 12px 5px ${colors.darts.triple}80`
          }}
          onClick={handleTriple}
        >
          Triple
        </button>
      </div>
      <div className="relative">
        <button
          className={`w-full h-16 bg-dark-700/70 hover:bg-dark-600/70 backdrop-blur-md rounded-lg text-gray-100 p-2 text-xl font-bold transition-shadow duration-150 ease-in-out flex flex-col items-center justify-center
            ${
              multiplier === 2 ? 'border border-darts-double' : 'border border-gray-600'
            }
            ${
              multiplier === 2 ? 'shadow-inset-darts-double' : 'shadow-inset-neon-blue'
            }
          `}
          onClick={handleBull}
        >
          <div className="text-center transition-transform duration-200 ease-in-out">25</div>
          <span className={`text-xs mt-0.5 overflow-hidden transition-all duration-200 ease-in-out 
            ${showMultipliedValues && multiplier === 2 ? 'opacity-100 max-h-4' : 'opacity-0 max-h-0'}
            text-darts-double
          `}>
            (50)
          </span>
        </button>
      </div>
    </div>
  );
};