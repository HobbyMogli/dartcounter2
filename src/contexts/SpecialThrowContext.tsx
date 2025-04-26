import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { SpecialThrow } from '../services/animations/specialThrowService';

// Interface for our context
interface SpecialThrowContextType {
  activeSpecialThrows: Map<number | string, SpecialThrow>;
  showSpecialThrow: (playerId: number | string, specialThrow: SpecialThrow) => void;
  hideSpecialThrow: (playerId: number | string) => void;
}

// Default context values
const defaultContext: SpecialThrowContextType = {
  activeSpecialThrows: new Map(),
  showSpecialThrow: () => {},
  hideSpecialThrow: () => {},
};

// Create the context
const SpecialThrowContext = createContext<SpecialThrowContextType>(defaultContext);

// Duration for animations in milliseconds (5 seconds)
const ANIMATION_DURATION = 5000;

// Provider component that will wrap the app
export const SpecialThrowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSpecialThrows, setActiveSpecialThrows] = useState<Map<number | string, SpecialThrow>>(
    new Map()
  );
  
  // Timer references to track auto-hide timeouts
  const timerRefs = React.useRef<Map<number | string, NodeJS.Timeout>>(new Map());
  
  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      timerRefs.current.forEach((timer) => {
        clearTimeout(timer);
      });
    };
  }, []);
  
  // Show a special throw animation for a player
  const showSpecialThrow = useCallback((playerId: number | string, specialThrow: SpecialThrow) => {
    // Clear any existing timer for this player
    const existingTimer = timerRefs.current.get(playerId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set the new special throw
    setActiveSpecialThrows((prev) => {
      const newMap = new Map(prev);
      newMap.set(playerId, specialThrow);
      return newMap;
    });
    
    // Set a timer to auto-hide the animation
    const timer = setTimeout(() => {
      hideSpecialThrow(playerId);
    }, ANIMATION_DURATION);
    
    timerRefs.current.set(playerId, timer);
  }, []);
  
  // Hide a special throw animation for a player
  const hideSpecialThrow = useCallback((playerId: number | string) => {
    // Clear any existing timer
    const existingTimer = timerRefs.current.get(playerId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      timerRefs.current.delete(playerId);
    }
    
    // Remove this player's special throw
    setActiveSpecialThrows((prev) => {
      const newMap = new Map(prev);
      newMap.delete(playerId);
      return newMap;
    });
  }, []);
  
  // Context value
  const value = {
    activeSpecialThrows,
    showSpecialThrow,
    hideSpecialThrow,
  };
  
  return (
    <SpecialThrowContext.Provider value={value}>
      {children}
    </SpecialThrowContext.Provider>
  );
};

// Custom hook to use the context
export const useSpecialThrow = () => useContext(SpecialThrowContext);