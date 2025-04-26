import React, { useState, useEffect, useRef } from 'react';
// Import necessary icons
import { HashtagIcon, AdjustmentsHorizontalIcon, ChartBarIcon, ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'; 
// Import colors for dynamic styling
import { colors } from '../../styles/theme/colors';
// Import special throw components
import SpecialThrowAnimation from '../animations/SpecialThrowAnimation';
import { useSpecialThrow } from '../../contexts/SpecialThrowContext';
import { detectSpecialThrow } from '../../services/animations/specialThrowService';

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
  // Add new props for checkout options
  checkoutOptions?: string[][];
  currentCheckoutIndex?: number;
  onNavigateCheckout?: (direction: 'prev' | 'next') => void;
  position?: 'left' | 'center' | 'right'; // Updated to include 'center' position
  playerId?: number | string; // Add playerId for special throw identification
}

const PlayerScoreCard: React.FC<PlayerScoreCardProps> = ({
  playerName,
  currentScore,
  lastThrows,
  isActive,
  statistics,
  showStats,
  showScoreSum,
  highlightDartIndex,
  // New checkout props with default values
  checkoutOptions = [],
  currentCheckoutIndex = 0,
  onNavigateCheckout,
  position = 'left', // Default to left if not specified
  playerId
}) => {
  // State to control checkout panel visibility
  const [showCheckoutPanel, setShowCheckoutPanel] = useState(false);
  
  // Get special throw context
  const { activeSpecialThrows } = useSpecialThrow();
  
  // Track last throws for special throw detection
  const lastThrowsRef = useRef<(ThrowDisplayData | null)[]>([]);
  const { showSpecialThrow } = useSpecialThrow();

  // Check for special throws when lastThrows changes
  useEffect(() => {
    // Check if all 3 throws are completed and not null
    if (playerId && lastThrows.filter(t => t !== null).length === 3) {
      // Check if the throws have changed from the last check
      const lastThrowsString = JSON.stringify(lastThrows);
      const prevThrowsString = JSON.stringify(lastThrowsRef.current);
      
      if (lastThrowsString !== prevThrowsString) {
        // Create a compatible array for detectSpecialThrow
        const throwsForDetection: ({ score: number; multiplier: number } | null)[] = 
          lastThrows.map(t => t === null ? null : { score: t.score, multiplier: t.multiplier });
        
        // Detect special throw with properly typed array
        const specialThrow = detectSpecialThrow(
          throwsForDetection.filter((t): t is { score: number; multiplier: number } => t !== null),
          currentScore
        );
        
        // Show animation if a special throw is detected
        if (specialThrow) {
          showSpecialThrow(playerId, specialThrow);
        }
        
        // Update ref with current throws
        lastThrowsRef.current = [...lastThrows];
      }
    } else if (currentScore === 2) {
      // Special case for Madhouse - detect when score reaches exactly 2
      const specialThrow = detectSpecialThrow([], currentScore);
      if (specialThrow && playerId) {
        showSpecialThrow(playerId, specialThrow);
      }
    }
  }, [lastThrows, currentScore, playerId, showSpecialThrow]);
  
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

  // Helper function to get style class based on throw type (S, D, T)
  const getThrowTypeClass = (throwLabel: string) => {
    const throwType = throwLabel.charAt(0);
    
    switch (throwType) {
      case 'S': return 'bg-gray-700/80'; // Single: gray
      case 'D': return 'bg-green-800/70'; // Double: green
      case 'T': return 'bg-red-800/70'; // Triple: red
      default: return 'bg-gray-700/80';
    }
  };

  // Check if we have checkout options to display
  const hasCheckoutOptions = checkoutOptions.length > 0;

  // Automatically open checkout panel when player becomes active and has checkout options
  useEffect(() => {
    if (isActive && hasCheckoutOptions) {
      setShowCheckoutPanel(true);
    }
  }, [isActive, hasCheckoutOptions]);

  // Toggle checkout panel visibility
  const toggleCheckoutPanel = () => {
    if (hasCheckoutOptions) {
      setShowCheckoutPanel(!showCheckoutPanel);
    }
  };

  // Handle navigation with arrows
  const handleNavigate = (direction: 'prev' | 'next') => {
    if (onNavigateCheckout && hasCheckoutOptions) {
      onNavigateCheckout(direction);
    }
  };

  // Define panel width constant - maximum 170px as specified
  const PANEL_WIDTH = 190;

  // Set fixed width for scorecard
  const SCORECARD_WIDTH = 224; // 56px * 4 = 224px (standard scorecard width)

  // Calculate container width based on panel visibility and position
  const getContainerStyle = () => {
    // Base styles for all positions
    const baseStyles: React.CSSProperties = {
      position: 'relative',
      transition: 'all 300ms ease-in-out',
    };

    // For center position with open panel, we need to expand width
    if (showCheckoutPanel) {
      if (position === 'center') {
        return {
          ...baseStyles,
          width: `${SCORECARD_WIDTH + PANEL_WIDTH}px`, // Card + Panel
        };
      } else if (position === 'left' || position === 'right') {
        return {
          ...baseStyles,
          width: `${SCORECARD_WIDTH}px`, // Just card width for left/right
        };
      }
    }

    // Default width for closed panel
    return {
      ...baseStyles,
      width: `${SCORECARD_WIDTH}px`,
    };
  };

  // Special throw animation for this player
  const specialThrow = playerId ? activeSpecialThrows.get(playerId) : undefined;

  return (
    <div 
      className="flex items-start relative"
      style={getContainerStyle()}
    >
      {/* Special Throw Animation - Only shown if playerId is defined and there's an active special throw */}
      {specialThrow && playerId && (
        <SpecialThrowAnimation 
          specialThrow={specialThrow} 
          position="top"
          size="medium"
        />
      )}
    
      {/* Checkout Panel - Left Side - Only shown if position is left */}
      {position === 'left' && hasCheckoutOptions && (
        <div 
          className="absolute top-0 right-full h-full transition-all duration-300 ease-in-out overflow-hidden"
          style={{
            width: showCheckoutPanel ? `${PANEL_WIDTH}px` : '0',
            opacity: showCheckoutPanel ? 1 : 0,
          }}
        >
          <div className="h-full bg-gray-900/90 backdrop-blur-sm border border-neon-blue rounded-l-xl p-3 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-neon-blue font-medium text-sm">Check-Out's:</h3>
              {checkoutOptions.length > 1 && (
          <div className="flex gap-1">
            <button 
              onClick={(e) => { e.stopPropagation(); handleNavigate('prev'); }} 
              className="p-1 rounded-full hover:bg-dark-700/50"
            >
              <ChevronLeftIcon className="h-4 w-4 text-neon-blue" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleNavigate('next'); }} 
              className="p-1 rounded-full hover:bg-dark-700/50"
            >
              <ChevronRightIcon className="h-4 w-4 text-neon-blue" />
            </button>
          </div>
              )}
            </div>
            <div className="checkout-options-container flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {checkoutOptions.map((option, optionIndex) => (
          <div 
            key={optionIndex} 
            className={`mb-2 p-1.5 rounded-lg transition-colors ${
              optionIndex === currentCheckoutIndex ? 'bg-dark-700/80 border border-neon-blue/30' : 'hover:bg-dark-700/50'
            }`}
          >
            <div className="text-xs text-gray-400 mb-1">Option {optionIndex + 1}</div>
            <div className="flex flex-wrap gap-1">
              {option.map((throwLabel, idx) => (
                <div 
            key={idx} 
            className={`${getThrowTypeClass(throwLabel)} border border-neon-blue/50 px-2 py-1 rounded text-white text-sm font-medium`}
                >
            {throwLabel}
                </div>
              ))}
            </div>
          </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Player Score Card - Center */}
      <div 
        className={`flex flex-col items-center p-6 bg-gray-900/70 backdrop-blur-sm border border-neon-blue rounded-2xl w-56 
                  ${isActive ? 'shadow-neon-blue-active' : 'shadow-neon-blue-inactive'} 
                  ${hasCheckoutOptions ? 'cursor-pointer' : ''}
                  text-gray-100 transition-shadow duration-300 relative z-50`}
        onClick={toggleCheckoutPanel}
      >
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
              className={`w-10 h-10 border ${index === highlightDartIndex ? 'border-neon-mint border-2' : 'border-neon-blue'} rounded flex items-center justify-center text-lg font-semibold text-gray-100 transition-shadow duration-150 ease-in-out ${ 
                // Check for null before accessing properties
                throw_ === null ? 'opacity-40' : 
                throw_.score < 0 ? `text-neon-red line-through decoration-neon-red decoration-1` : '' // Busted styling based on score < 0
              }`}
              style={{
                // Conditional boxShadow: Highlight current dart > Multiplier > Default
                boxShadow: 
                  index === highlightDartIndex // Prioritize highlight
                    ? `inset 0 0 8px 0 ${colors.neon.mint}` // Highlight: lime shadow
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

        {/* Checkout mini indicator - ALWAYS shown if checkout options available (not based on isActive) */}
        {hasCheckoutOptions && (
          <div className="absolute top-2 right-2">
            <div className={`h-2 w-2 rounded-full bg-neon-blue ${!showCheckoutPanel ? 'animate-pulse' : ''}`}></div>
          </div>
        )}

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
      
      {/* Checkout Panel - Right Side */}
      {position === 'right' && hasCheckoutOptions && (
        <div 
          className="checkout-panel absolute z-20 top-0 h-full transition-all duration-300 ease-in-out overflow-hidden"
          style={{
            left: `${SCORECARD_WIDTH - 1}px`, // Overlap the border by 1px for seamless connection
            width: showCheckoutPanel ? `${PANEL_WIDTH}px` : '0',
            opacity: showCheckoutPanel ? 1 : 0,
          }}
        >
          <div className="h-full bg-gray-900/90 backdrop-blur-sm border border-neon-blue rounded-r-xl p-3 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-neon-blue font-medium text-sm">Check-Out's:</h3>
              {checkoutOptions.length > 1 && (
                <div className="flex gap-1 ml-auto">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleNavigate('prev'); }} 
                    className="p-1 rounded-full hover:bg-dark-700/50"
                  >
                    <ChevronLeftIcon className="h-4 w-4 text-neon-blue" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleNavigate('next'); }} 
                    className="p-1 rounded-full hover:bg-dark-700/50"
                  >
                    <ChevronRightIcon className="h-4 w-4 text-neon-blue" />
                  </button>
                </div>
              )}
            </div>
            <div className="checkout-options-container flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {checkoutOptions.map((option, optionIndex) => (
                <div 
                  key={optionIndex} 
                  className={`mb-2 p-1.5 rounded-lg transition-colors ${
                    optionIndex === currentCheckoutIndex ? 'bg-dark-700/80 border border-neon-blue/30' : 'hover:bg-dark-700/50'
                  }`}
                >
                  <div className="text-xs text-gray-400 mb-1">Option {optionIndex + 1}</div>
                  <div className="flex flex-wrap gap-1">
                    {option.map((throwLabel, idx) => (
                      <div 
                        key={idx} 
                        className={`${getThrowTypeClass(throwLabel)} border border-neon-blue/50 px-2 py-1 rounded text-white text-sm font-medium`}
                      >
                        {throwLabel}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Checkout Panel - Center Position (separate implementation) */}
      {position === 'center' && hasCheckoutOptions && (
        <div 
          className="checkout-panel absolute z-20 top-0 h-full transition-all duration-300 ease-in-out overflow-hidden"
          style={{
            left: `${SCORECARD_WIDTH - 1}px`, // Overlap the border by 1px for seamless connection
            width: showCheckoutPanel ? `${PANEL_WIDTH}px` : '0',
            opacity: showCheckoutPanel ? 1 : 0,
          }}
        >
          <div className="h-full bg-gray-900/90 backdrop-blur-sm border border-neon-blue rounded-r-xl p-3 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-neon-blue font-medium text-sm">Check-Out's:</h3>
              {checkoutOptions.length > 1 && (
                <div className="flex gap-1 ml-auto">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleNavigate('prev'); }} 
                    className="p-1 rounded-full hover:bg-dark-700/50"
                  >
                    <ChevronLeftIcon className="h-4 w-4 text-neon-blue" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleNavigate('next'); }} 
                    className="p-1 rounded-full hover:bg-dark-700/50"
                  >
                    <ChevronRightIcon className="h-4 w-4 text-neon-blue" />
                  </button>
                </div>
              )}
            </div>
            <div className="checkout-options-container flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {checkoutOptions.map((option, optionIndex) => (
                <div 
                  key={optionIndex} 
                  className={`mb-2 p-1.5 rounded-lg transition-colors ${
                    optionIndex === currentCheckoutIndex ? 'bg-dark-700/80 border border-neon-blue/30' : 'hover:bg-dark-700/50'
                  }`}
                >
                  <div className="text-xs text-gray-400 mb-1">Option {optionIndex + 1}</div>
                  <div className="flex flex-wrap gap-1">
                    {option.map((throwLabel, idx) => (
                      <div 
                        key={idx} 
                        className={`${getThrowTypeClass(throwLabel)} border border-neon-blue/50 px-2 py-1 rounded text-white text-sm font-medium`}
                      >
                        {throwLabel}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerScoreCard;