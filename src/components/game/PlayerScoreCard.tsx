import React from 'react';
// Import necessary icons
import { HashtagIcon, AdjustmentsHorizontalIcon, ChartBarIcon, ArrowUpIcon } from '@heroicons/react/24/outline'; 
// Import colors for dynamic styling
import { colors } from '../../styles/theme/colors';

// Re-use the interface from Game.tsx or define locally
interface ThrowDisplayData {
  score: number;
  multiplier: number;
}

interface PlayerScoreCardProps {
  playerName: string;
  currentScore: number;
  lastThrows: (ThrowDisplayData | null)[];
  isActive: boolean;
  statistics: {
    average: number;
    dartsThrown: number;
    highestScore: number;
  };
  showStats: boolean;
  showScoreSum: boolean;
  highlightDartIndex: number; // Index to highlight (-1 for none)
}

const PlayerScoreCard: React.FC<PlayerScoreCardProps> = ({
  playerName,
  currentScore,
  lastThrows,
  isActive,
  statistics,
  showStats,
  showScoreSum,
  highlightDartIndex
}) => {
  // Add console logs for debugging
  console.log(`[PlayerScoreCard ${playerName}] Props received:`, { statistics, lastThrows, highlightDartIndex });

  // Hilfsfunktion zum Formatieren der Würfe - expects object now
  const formatThrow = (throwData: ThrowDisplayData | null) => {
    if (throwData === null) return '–';
    const score = throwData.score; // Extract score
    // Negative values indicate busted throws
    if (score < 0) return Math.abs(score); 
    return score;
  };
  
  // Berechne die Summe der letzten Würfe für die "Score" Anzeige - use throw_.score
  const lastThrowSum = lastThrows.reduce((sum: number, throw_, index) => {
    // If throw_ is not null, add the absolute score value
    // Log the value being added
    const scoreValue = throw_ === null ? 0 : throw_.score;
    console.log(`[PlayerScoreCard ${playerName}] Reduce index ${index}: throw_ =`, throw_, `scoreValue = ${scoreValue}, typeof = ${typeof scoreValue}`);
    // Check explicitly for NaN before adding
    const valueToAdd = throw_ === null ? 0 : (isNaN(throw_.score) ? 0 : Math.abs(throw_.score));
    if (isNaN(scoreValue) && throw_ !== null) {
      console.error(`[PlayerScoreCard ${playerName}] NaN detected for throw at index ${index}:`, throw_);
    }
    return sum + valueToAdd;
  }, 0);

  // Log the calculated sum
  console.log(`[PlayerScoreCard ${playerName}] Calculated lastThrowSum:`, lastThrowSum);
  // Log the average value specifically
  console.log(`[PlayerScoreCard ${playerName}] Statistics average:`, statistics.average);

  return (
    // Conditionally apply a stronger shadow if the card is active
    <div className={`flex flex-col items-center p-6 bg-gray-900/70 backdrop-blur-sm border border-neon-blue rounded-2xl w-56 ${isActive ? 'shadow-neon-blue-active' : 'shadow-neon-blue-inactive'} text-gray-100 transition-shadow duration-300`}>
      {/* Player Name */}
      <div className="text-xl font-bold mb-2">{playerName}</div>

      {/* Remaining Score - Use default text color */}
      <div className={`text-5xl font-bold text-gray-100 mb-4`}>{currentScore}</div>

      {/* Last Throws - Use neon blue for border and boxShadow, but gray-100 for text */}
      <div className="flex gap-2 mb-4">
        {lastThrows.map((throw_, index) => (
          <div
            key={index}
            // Conditionally set border color based on highlightDartIndex
            className={`w-10 h-10 border ${index === highlightDartIndex ? 'border-neon-lime border-2' : 'border-neon-blue'} rounded flex items-center justify-center text-lg font-semibold text-gray-100 transition-shadow duration-150 ease-in-out ${ 
              // Check for null before accessing properties
              throw_ === null ? 'opacity-40' : 
              throw_.score < 0 ? `text-neon-red line-through decoration-neon-red decoration-1` : '' // Busted styling based on score < 0
            }`}
            style={{
              // Conditional boxShadow: Highlight current dart > Multiplier > Default
              boxShadow: 
                index === highlightDartIndex // Prioritize highlight
                  ? `inset 0 0 8px 0 ${colors.neon.lime}` // Highlight: lime shadow
                  : throw_ === null 
                    ? 'none' 
                    : throw_.multiplier === 3 
                      ? `inset 0 0 16px 0 ${colors.darts.triple}` // Triple: darts.triple
                      : throw_.multiplier === 2 
                        ? `inset 0 0 12px 0 ${colors.darts.double}` // Double: darts.double
                        : `inset 0 0 5px 0 ${colors.neon.blue}` // Single or default: neon.blue
            }}
          >
            {/* Pass the whole object or null to formatThrow */} 
            {formatThrow(throw_)} 
          </div>
        ))}
      </div>

      {/* Statistics Section - Conditionally render the whole block based on showStats OR showScoreSum */}
      {(showStats || showScoreSum) && ( // Show the container if EITHER score sum OR stats are visible
        <div className="text-sm space-y-1 w-full mt-auto"> 
          {/* Score (Sum of last throws) - Conditionally render based on showScoreSum */}
          {showScoreSum && (
            <div className="flex justify-between items-center h-6"> 
              <div className="flex items-center gap-1.5">
                <HashtagIcon className={`w-4 h-4 text-neon-blue/80`} /> {/* Use standard class */} 
                <span className={`text-neon-blue`}>Score</span> {/* Use standard class */} 
              </div>
              <span className={`font-semibold text-neon-blue`}>{lastThrowSum}</span> {/* Use standard class */} 
            </div>
          )}

          {/* Darts Thrown - Conditionally render based on showStats */}
          {showStats && (
            <div className="flex justify-between items-center h-6"> 
              <div className="flex items-center gap-1.5">
                <AdjustmentsHorizontalIcon className={`w-4 h-4 text-neon-blue/80`} /> {/* Use standard class */} 
                <span className={`text-neon-blue`}>Darts</span> {/* Use standard class */} 
              </div>
              <span className={`font-semibold text-neon-blue`}>{statistics.dartsThrown}</span> {/* Use standard class */} 
            </div>
          )}

          {/* Average - Conditionally render based on showStats */}
          {showStats && (
            <div className="flex justify-between items-center h-6"> 
              <div className="flex items-center gap-1.5">
                <ChartBarIcon className={`w-4 h-4 text-neon-blue/80`} /> {/* Use standard class */} 
                <span className={`text-neon-blue`}>Ø</span> {/* Use standard class */} 
              </div>
              <span className={`font-semibold text-neon-blue`}>{statistics.average.toFixed(1)}</span> {/* Use standard class */} 
            </div>
          )}

          {/* Highest Throw - Conditionally render based on showStats */}
          {showStats && (
            <div className="flex justify-between items-center h-6"> 
              <div className="flex items-center gap-1.5">
                <ArrowUpIcon className={`w-4 h-4 text-neon-blue/80`} /> {/* Use standard class */} 
                <span className={`text-neon-blue`}>Highest</span> {/* Use standard class */} 
              </div>
              <span className={`font-semibold text-neon-blue`}>{statistics.highestScore}</span> {/* Use standard class */} 
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayerScoreCard;