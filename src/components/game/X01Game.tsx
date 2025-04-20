import React, { useState, useEffect } from 'react';
import { DartKeypad } from './DartKeypad';
import { useSettings } from '../../contexts/SettingsContext';

interface X01GameProps {
  currentScore: number; // Aktueller Punktestand des aktiven Spielers
  onGameEnd: (score: number) => void;
  onThrow?: (score: number, multiplier: number, targetNumber?: number, isBull?: boolean) => void;
  onUndo?: () => void;
}

export const X01Game: React.FC<X01GameProps> = ({
  currentScore,
  onGameEnd,
  onThrow,
  onUndo: parentOnUndo
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const settings = useSettings();

  // Überprüfe, ob das Spiel beendet ist, wenn sich currentScore ändert
  useEffect(() => {
    if (currentScore === 0) {
      onGameEnd(currentScore);
    }
  }, [currentScore, onGameEnd]);

  const handleScore = async (score: number, multiplier: number, targetNumber?: number, isBull?: boolean) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // Notify parent component about the throw
      if (onThrow) {
        onThrow(score, multiplier, targetNumber, isBull);
      }
    } catch (error) {
      console.error('Error recording throw:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUndo = () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // Notify parent about undo
      if (parentOnUndo) {
        parentOnUndo();
      }
    } catch (error) {
      console.error('Error undoing throw:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <DartKeypad
        onScore={handleScore}
        onUndo={handleUndo}
        showMultipliedValues={settings.showMultipliedValues}
      />
    </div>
  );
}; 