import React, { useState } from 'react';
import { DartKeypad } from './DartKeypad';
import { toast } from 'react-hot-toast';
import { PlayerGameState } from '../../pages/GameHost';
import { X01Settings } from '../../types/gameTypes';
import { useSettings } from '../../contexts/SettingsContext';

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
  updateRoundAndDart
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const appSettings = useSettings(); // Get global settings

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