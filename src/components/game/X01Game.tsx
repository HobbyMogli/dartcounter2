import React, { useState, useEffect } from 'react';
import { DartKeypad } from './DartKeypad';
import { toast } from 'react-hot-toast';
import { PlayerGameState } from '../../pages/GameHost';
import { X01Settings } from '../../types/gameTypes';
import { useSettings } from '../../contexts/SettingsContext';
import { useSpecialThrow } from '../../contexts/SpecialThrowContext';
import { detectSpecialThrow } from '../../services/animations/specialThrowService';

// Types for checkout calculator
type SegmentType = 'S' | 'D' | 'T';
interface ThrowOption {
  label: string;      // z.B. "S20", "D25", "T19"
  value: number;      // 1…60
  type: SegmentType;  // 'S', 'D' oder 'T'
}

type CheckoutRule = 'Single-Out' | 'Double-Out' | 'Triple-Out';

// Score below which checkouts are possible
const MAX_CHECKOUT_SCORE = 170;

// Define interface for player-specific checkout options
export interface PlayerCheckoutOptions {
  playerId: number;
  checkoutOptions: string[][];
}

interface X01GameProps {
  gameId: number;
  players: PlayerGameState[];
  activePlayerIndex: number;
  currentRound: number;
  settings: X01Settings;
  onUndo: () => void;
  onBust: (
    playerId: number, 
    playerName: string, 
    throwValue: number, 
    multiplier: number, 
    dartNumber: number, 
    roundNumber: number, 
    targetNumber?: number, 
    isBull?: boolean
  ) => Promise<void>;
  onRegisterThrow: (
    playerId: number, 
    throwValue: number, 
    multiplier: number, 
    dartNumber: number, 
    roundNumber: number, 
    targetNumber?: number, 
    isBull?: boolean,
    isBust?: boolean,
    isWinningThrow?: boolean
  ) => Promise<boolean>;
  onPlayerSwitch: (nextPlayerIndex: number, nextRound: number) => Promise<void>;
  onGameOver: (winnerIndex: number) => Promise<void>;
  updateRoundAndDart: (playerIndex: number, dartNumber: number) => boolean;
  onCheckoutOptionsChange?: (allPlayersOptions: PlayerCheckoutOptions[]) => void;
}

export const X01Game: React.FC<X01GameProps> = ({
  players,
  activePlayerIndex,
  currentRound,
  settings,
  onUndo,
  onBust,
  onRegisterThrow,
  onPlayerSwitch,
  onGameOver,
  updateRoundAndDart,
  onCheckoutOptionsChange
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const appSettings = useSettings(); // Get global settings
  const { showSpecialThrow } = useSpecialThrow(); // Get special throw context

  // Erzeuge alle möglichen Segmente
  const makeThrows = (): ThrowOption[] => {
    const throws: ThrowOption[] = [];
    // Single 1–20
    for (let i = 1; i <= 20; i++) {
      throws.push({ label: `S${i}`, value: i, type: 'S' });
    }
    // Double 1–20
    for (let i = 1; i <= 20; i++) {
      throws.push({ label: `D${i}`, value: 2 * i, type: 'D' });
    }
    // Triple 1–20
    for (let i = 1; i <= 20; i++) {
      throws.push({ label: `T${i}`, value: 3 * i, type: 'T' });
    }
    // Bull (Single 25) und Doppel-Bull (Double 25)
    throws.push({ label: 'S25', value: 25, type: 'S' });
    throws.push({ label: 'D25', value: 50, type: 'D' });
    return throws;
  };

  // Get all possible checkout combinations
  const getCheckouts = (score: number, rule: CheckoutRule): string[][] => {
    const allThrows = makeThrows();
    // Filter allowed finishing throws
    const lastThrows = allThrows.filter(t => {
      if (rule === 'Single-Out') return t.type === 'S';
      if (rule === 'Double-Out') return t.type === 'D';
      if (rule === 'Triple-Out') return t.type === 'T';
      return false;
    });

    const results: string[][] = [];

    // 1 Dart-Checkout
    for (const L of lastThrows) {
      if (L.value === score) {
        results.push([L.label]);
      }
    }

    // 2 Dart-Checkout
    for (const P of allThrows) {
      for (const L of lastThrows) {
        if (P.value + L.value === score) {
          results.push([P.label, L.label]);
        }
      }
    }

    // 3 Dart-Checkout (avoiding duplicate first two throw combinations)
    for (let i = 0; i < allThrows.length; i++) {
      const P1 = allThrows[i];
      for (let j = i; j < allThrows.length; j++) {
        const P2 = allThrows[j];
        for (const L of lastThrows) {
          if (P1.value + P2.value + L.value === score) {
            results.push([P1.label, P2.label, L.label]);
          }
        }
      }
    }

    return results;
  };

  // Helper function to calculate checkout options for a player
  const calculatePlayerCheckouts = (player: PlayerGameState, dartsLeft: number): string[][] => {
    const playerScore = player.currentScore;
    
    if (playerScore <= MAX_CHECKOUT_SCORE && playerScore > 1) {
      const finishRule: CheckoutRule = 
        settings.checkOut === 'straight' ? 'Single-Out' : 
        settings.checkOut === 'triple' ? 'Triple-Out' : 'Double-Out';
        
      const options = getCheckouts(playerScore, finishRule);
      
      let filteredOptions = [...options];
      
      // Only filter based on available darts if we're not showing all checkouts
      if (!appSettings.showAllCheckouts) {
        // Filter checkout options based on number of darts left for this player
        filteredOptions = options.filter(checkout => {
          // Only show checkouts that are possible with the darts left
          if (checkout.length > dartsLeft) {
            return false;
          }
          
          // Show only 1-dart finishes when 1 dart left
          if (dartsLeft === 1) {
            return checkout.length === 1;
          }
          
          // Show only 1 and 2-dart finishes when 2 darts left
          if (dartsLeft === 2) {
            return checkout.length <= 2;
          }
          
          // For 3 darts left, show all possible checkouts (1, 2, and 3 darts)
          return true;
        });
      }
      
      // Sort checkouts by length (fewer darts first)
      filteredOptions.sort((a, b) => a.length - b.length);
      
      return filteredOptions;
    }
    
    return [];
  };

  // Update checkout options for all players
  useEffect(() => {
    if (!players.length) return;
    
    // Calculate checkout options for each player
    const allPlayersOptions: PlayerCheckoutOptions[] = players.map(player => {
      // For all players, calculate checkout options using their current score
      // Always use 3 darts for non-active players to show all possible checkouts for next round
      const dartsLeft = player.id === players[activePlayerIndex].id ? 
        (player.currentDart > 3 ? 3 : (4 - player.currentDart)) : 
        3; // Always 3 darts for non-active players for next turn planning
      
      return {
        playerId: player.id,
        checkoutOptions: calculatePlayerCheckouts(player, dartsLeft)
      };
    });
    
    // Pass all player checkout options to the parent component
    if (onCheckoutOptionsChange) {
      onCheckoutOptionsChange(allPlayersOptions);
    }
  }, [
    players, // Recalculate when any player's data changes
    settings.checkOut, // Recalculate when checkout rule changes
    onCheckoutOptionsChange, 
    appSettings.showAllCheckouts,
    activePlayerIndex // Recalculate when active player changes
  ]);

  // Handle scoring in X01
  const handleThrow = async (score: number, multiplier: number, targetNumber?: number, isBull?: boolean) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const currentPlayer = players[activePlayerIndex];
      const dartNumber = currentPlayer.currentDart;
      const throwValue = score * multiplier;
      const newScore = currentPlayer.currentScore - throwValue;

      // X01-specific validation checks
      if (newScore < 0) {
        console.log('Score would go below zero, marking as bust');
        toast.error('Bust! Score cannot go below zero.');
        
        await onBust(
          parseInt(currentPlayer.id.toString()), 
          currentPlayer.name,
          throwValue, 
          multiplier, 
          dartNumber, 
          currentRound, 
          targetNumber, 
          isBull
        );
        return;
      }
      
      // Check for impossible checkouts
      // For double-out: can't finish with score of 1 remaining
      if (settings.checkOut === 'double' && newScore === 1) {
        console.log('Cannot checkout with score of 1 in double-out mode');
        toast.error('Bust! Cannot finish with a score of 1.');
        
        await onBust(
          parseInt(currentPlayer.id.toString()), 
          currentPlayer.name,
          throwValue, 
          multiplier, 
          dartNumber, 
          currentRound, 
          targetNumber, 
          isBull
        );
        return;
      }
      
      // For triple-out: can't finish with score of 2 remaining
      if (settings.checkOut === 'triple' && newScore === 2) {
        console.log('Cannot checkout with score of 2 in triple-out mode');
        toast.error('Bust! Cannot finish with a score of 2.');
        
        await onBust(
          parseInt(currentPlayer.id.toString()), 
          currentPlayer.name,
          throwValue, 
          multiplier, 
          dartNumber, 
          currentRound, 
          targetNumber, 
          isBull
        );
        return;
      }

      // Check for checkout rules when player is about to win (newScore === 0)
      if (newScore === 0) {
        // Check if the throw meets the checkout requirement
        let validCheckout = true;
        
        if (settings.checkOut === 'double' && multiplier !== 2 && !isBull) {
          console.log(`Invalid checkout: Must finish on a double when using double-out rule.`);
          toast.error(`Bust! You must finish on a double.`);
          validCheckout = false;
        }
        
        if (settings.checkOut === 'triple' && multiplier !== 3) {
          console.log(`Invalid checkout: Must finish on a triple when using triple-out rule.`);
          toast.error(`Bust! You must finish on a triple.`);
          validCheckout = false;
        }
        
        // Use a straight checkout validation only if we add a "master" checkout option in the future
        // Currently, master checkout is not in X01Settings type definition, so we remove this to fix TS error
        
        if (!validCheckout) {
          // Handle as a bust since the checkout was invalid
          await onBust(
            parseInt(currentPlayer.id.toString()), 
            currentPlayer.name,
            throwValue, 
            multiplier, 
            dartNumber, 
            currentRound, 
            targetNumber, 
            isBull
          );
          return;
        }
      }

      // Register the throw with the GameHost
      const success = await onRegisterThrow(
        parseInt(currentPlayer.id.toString()), 
        throwValue, 
        multiplier, 
        dartNumber, 
        currentRound, 
        targetNumber, 
        isBull,
        false, // isBust
        newScore === 0 // isWinningThrow
      );
      
      if (!success) {
        console.error('Failed to register throw');
        return;
      }

      // Construct the current throws array for special throw detection
      const currentThrows = [...players[activePlayerIndex].lastThrows];
      // Add the current throw to the array at the position based on dart number (0-indexed)
      if (dartNumber >= 1 && dartNumber <= 3) {
        currentThrows[dartNumber - 1] = { score: throwValue, multiplier };
      }
      
      // Create a properly typed array for detectSpecialThrow
      const throwsForDetection: ({ score: number; multiplier: number } | null)[] = 
        currentThrows.map(t => t === null ? null : { score: t.score, multiplier: t.multiplier });
      
      // Check for special throws with properly typed array
      const specialThrow = detectSpecialThrow(
        throwsForDetection.filter((t): t is { score: number; multiplier: number } => t !== null),
        newScore
      );
      
      if (specialThrow && currentPlayer.id) {
        // Show the special throw animation for this player
        showSpecialThrow(currentPlayer.id, specialThrow);
      }

      // If this was a winning throw
      if (newScore === 0) {
        toast.success(`Game Over! ${currentPlayer.name} wins!`);
        await onGameOver(activePlayerIndex);
        return;
      }
      
      // Update round and dart, and check if we need to switch players
      const shouldSwitchPlayer = updateRoundAndDart(activePlayerIndex, dartNumber);
      
      // If we should switch players
      if (shouldSwitchPlayer) {
        const nextPlayerIndex = (activePlayerIndex + 1) % players.length;
        const nextRound = currentRound + 1; // Only increment when switching after dart 3
        
        // Switch to next player with new round number
        await onPlayerSwitch(nextPlayerIndex, nextRound);
      }
    } catch (error) {
      console.error('Error handling throw:', error);
      toast.error('An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <DartKeypad
        onScore={handleThrow}
        onUndo={onUndo}
        showMultipliedValues={appSettings.showMultipliedValues} // Use from global settings instead
      />
    </div>
  );
};