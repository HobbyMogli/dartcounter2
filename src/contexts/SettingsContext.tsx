import React, { createContext, useContext, useState } from 'react';

interface SettingsContextType {
  showMultipliedValues: boolean;
  showStatistics: boolean;
  highlightCurrentDart: boolean;
  showLastThrowSum: boolean;
  showThrowHistory: boolean;
  showDebugInfo: boolean;
  showAllCheckouts: boolean; // New setting for checkout options
  updateSettings: (settings: Partial<SettingsContextType>) => void;
}

const defaultSettings: SettingsContextType = {
  showMultipliedValues: true,
  showStatistics: true,
  highlightCurrentDart: true,
  showLastThrowSum: true,
  showThrowHistory: true,
  showDebugInfo: false,
  showAllCheckouts: false, // Default to false - show only checkouts possible with remaining darts
  updateSettings: () => {},
};

const SettingsContext = createContext<SettingsContextType>(defaultSettings);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SettingsContextType>(defaultSettings);

  const updateSettings = (newSettings: Partial<SettingsContextType>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <SettingsContext.Provider value={{ ...settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);