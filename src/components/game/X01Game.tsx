import React, { useState } from 'react';
import { DartKeypad } from './DartKeypad';
import { useSettings } from '../../contexts/SettingsContext';

interface X01GameProps {
  onThrow?: (score: number, multiplier: number, targetNumber?: number, isBull?: boolean) => void;
  onUndo?: () => void;
}

export const X01Game: React.FC<X01GameProps> = ({
  onThrow,
  onUndo: parentOnUndo
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const settings = useSettings();

  const handleScore = async (score: number, multiplier: number, targetNumber?: number, isBull?: boolean) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // Notify parent component about the throw
      // The parent component will handle all validation and game logic
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