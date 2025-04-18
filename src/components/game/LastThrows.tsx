import React from 'react';
import type { Throw } from '@prisma/client';
import { colors } from '../../styles/theme/colors';

interface LastThrowsProps {
  throws: Throw[];
  currentDart: number;
}

export const LastThrows: React.FC<LastThrowsProps> = ({ throws, currentDart }) => {
  // Sort throws by round and dart number
  const sortedThrows = [...throws].sort((a, b) => {
    if (a.roundNumber !== b.roundNumber) {
      return b.roundNumber - a.roundNumber;
    }
    return b.dartNumber - a.dartNumber;
  });

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-lg font-semibold text-gray-100">Last Throws</h3>
      <div className="grid grid-cols-3 gap-2">
        {sortedThrows.slice(0, 9).map((throwData) => (
          <div
            key={throwData.id}
            className={`p-2 rounded-lg text-center ${
              throwData.multiplier === 2
                ? `border border-[${colors.darts.double}]`
                : throwData.multiplier === 3
                ? `border border-[${colors.darts.triple}]`
                : 'border border-gray-600'
            }`}
          >
            <div className="text-sm text-gray-400">
              {throwData.roundNumber}.{throwData.dartNumber}
            </div>
            <div className="text-lg font-bold">
              {throwData.score}
              {throwData.isBull && ' 🎯'}
            </div>
            {throwData.multiplier > 1 && (
              <div className="text-xs">
                {throwData.targetNumber} x{throwData.multiplier}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="text-sm text-gray-400 text-center">
        Current Dart: {currentDart}
      </div>
    </div>
  );
}; 