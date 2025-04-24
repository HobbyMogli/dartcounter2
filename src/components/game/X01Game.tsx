import React, { useState, useEffect } from 'react';
import { DartKeypad } from './DartKeypad';
import { toast } from 'react-hot-toast';
import { PlayerGameState } from '../../pages/GameHost';
import { X01Settings } from '../../types/gameTypes';
import { useSettings } from '../../contexts/SettingsContext';

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
  onCheckoutOptionsChange?: (options: string[][]) => void;
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

  // Checkout calculator state
  const [checkoutOptions, setCheckoutOptions] = useState<string[][]>([]);
  const [currentCheckoutIndex, setCurrentCheckoutIndex] = useState(0);

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

  // Navigate through checkout options
  const navigateCheckout = (direction: 'prev' | 'next') => {
    if (checkoutOptions.length === 0) return;
    
    if (direction === 'prev') {
      setCurrentCheckoutIndex(prev => 
        prev === 0 ? checkoutOptions.length - 1 : prev - 1);
    } else {
      setCurrentCheckoutIndex(prev => 
        prev === checkoutOptions.length - 1 ? 0 : prev + 1);
    }
  };

  // Handle keyboard navigation for checkouts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (checkoutOptions.length === 0) return;
      
      if (e.key === 'ArrowLeft') {
        navigateCheckout('prev');
      } else if (e.key === 'ArrowRight') {
        navigateCheckout('next');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [checkoutOptions.length, currentCheckoutIndex]);

  // Update checkout options when player score changes
  useEffect(() => {
    if (!players[activePlayerIndex]) return;
    
    const currentPlayer = players[activePlayerIndex];
    const playerScore = currentPlayer.currentScore;
    const dartsLeftToThrow = 4 - currentPlayer.currentDart; // Assuming darts are 1-indexed and max is 3
    
    if (playerScore <= MAX_CHECKOUT_SCORE && playerScore > 1) {
      const finishRule: CheckoutRule = 
        settings.checkOut === 'straight' ? 'Single-Out' : 
        settings.checkOut === 'triple' ? 'Triple-Out' : 'Double-Out';
        
      const options = getCheckouts(playerScore, finishRule);
      
      let filteredOptions = [...options];
      
      // Only filter based on available darts if we're not showing all checkouts
      if (!appSettings.showAllCheckouts) {
        // Filter checkout options based on number of darts left
        filteredOptions = options.filter(checkout => {
          // Only show checkouts that are possible with the darts left
          if (checkout.length > dartsLeftToThrow) {
            return false;
          }
          
          // Show only 1-dart finishes when 1 dart left
          if (dartsLeftToThrow === 1) {
            return checkout.length === 1;
          }
          
          // Show only 1 and 2-dart finishes when 2 darts left
          if (dartsLeftToThrow === 2) {
            return checkout.length <= 2;
          }
          
          // For 3 darts left, show all possible checkouts (1, 2, and 3 darts)
          return true;
        });
      }
      
      // Sort checkouts by length (fewer darts first)
      filteredOptions.sort((a, b) => a.length - b.length);
      
      setCheckoutOptions(filteredOptions);
      setCurrentCheckoutIndex(0);
      
      // Pass checkout options to the parent component if handler exists
      if (onCheckoutOptionsChange) {
        onCheckoutOptionsChange(filteredOptions);
      }
    } else {
      setCheckoutOptions([]);
      // Pass empty options to the parent component if handler exists
      if (onCheckoutOptionsChange) {
        onCheckoutOptionsChange([]);
      }
    }
  }, [players, activePlayerIndex, settings.checkOut, onCheckoutOptionsChange, appSettings.showAllCheckouts]);

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
      
      // Case 1: Double-Out and remaining score less than 2 (impossible to checkout)
      if (currentPlayer.currentScore < 2 && settings.checkOut === 'double') {
        console.log(`Impossible checkout: Player ${currentPlayer.name} has score less than 2 with double-out rule.`);
        toast.error(`Bust! Score less than 2 cannot be checked out with a double.`);
        
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
      
      // Case 2: Triple-Out and remaining score less than 3 (impossible to checkout)
      if (currentPlayer.currentScore < 3 && settings.checkOut === 'triple') {
        console.log(`Impossible checkout: Player ${currentPlayer.name} has score less than 3 with triple-out rule.`);
        toast.error(`Bust! Score less than 3 cannot be checked out with a triple.`);
        
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
      
      // Check if the throw would leave the player with an impossible checkout
      // Case 1: Double-Out and new score would be less than 2 but not 0 (impossible to checkout)
      if (newScore > 0 && newScore < 2 && settings.checkOut === 'double') {
        console.log(`Throw would cause impossible checkout: Player ${currentPlayer.name} would have score ${newScore} with double-out rule.`);
        toast.error(`Bust! Score of ${newScore} cannot be checked out with a double.`);
        
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
      
      // Case 2: Triple-Out and new score would be less than 3 but not 0 (impossible to checkout)
      if (newScore > 0 && newScore < 3 && settings.checkOut === 'triple') {
        console.log(`Throw would cause impossible checkout: Player ${currentPlayer.name} would have score ${newScore} with triple-out rule.`);
        toast.error(`Bust! Score of ${newScore} cannot be checked out with a triple.`);
        
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

      // Handle bust for scores that would go below 0
      if (newScore < 0) {
        console.log(`Bust! Player ${currentPlayer.name}'s score would go below 0.`);
        toast.error("Bust! Score would go below zero.");
        
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