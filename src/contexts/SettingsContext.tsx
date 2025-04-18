import React, { createContext, useContext, useState } from 'react';

interface SettingsContextType {
  showMultipliedValues: boolean;
  showStatistics: boolean;
  showLastThrowSum: boolean;
  showThrowHistory: boolean;
  updateSettings: (settings: Partial<SettingsContextType>) => void;
}

const defaultSettings: SettingsContextType = {
  showMultipliedValues: true,
  showStatistics: true,
  showLastThrowSum: true,
  showThrowHistory: true,
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