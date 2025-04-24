import React from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { FaTimes } from 'react-icons/fa';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ToggleProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

const Toggle: React.FC<ToggleProps> = ({ label, description, value, onChange }) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex flex-col">
      <span className="text-gray-100 font-medium">{label}</span>
      <span className="text-gray-400 text-sm">{description}</span>
    </div>
    <button
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        value ? 'bg-neon-blue' : 'bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const settings = useSettings();

  const toggleOptions = [
    {
      label: 'Game Statistics',
      description: 'Show game statistics during gameplay',
      value: settings.showStatistics,
      onChange: (value: boolean) => settings.updateSettings({ showStatistics: value }),
    },
    {
      label: 'All Possible Checkouts',
      description: 'Show all possible checkouts, not just those doable with remaining darts',
      value: settings.showAllCheckouts,
      onChange: (value: boolean) => settings.updateSettings({ showAllCheckouts: value }),
    },
    {
      label: 'Throw History',
      description: 'Show the history of throws',
      value: settings.showThrowHistory,
      onChange: (value: boolean) => settings.updateSettings({ showThrowHistory: value }),
    },
    {
      label: 'Last Throw Sum',
      description: 'Show the sum of the last throw',
      value: settings.showLastThrowSum,
      onChange: (value: boolean) => settings.updateSettings({ showLastThrowSum: value }),
    },
    {
      label: 'Multiplied Values',
      description: 'Show multiplied values (e.g., 2x, 3x) on the keypad',
      value: settings.showMultipliedValues,
      onChange: (value: boolean) => settings.updateSettings({ showMultipliedValues: value }),
    },
    {
      label: 'Highlight Current Dart',
      description: 'Highlight the box for the current dart to be thrown',
      value: settings.highlightCurrentDart,
      onChange: (value: boolean) => settings.updateSettings({ highlightCurrentDart: value }),
    },
    {
      label: 'Debug Information',
      description: 'Show detailed game state and debugging information',
      value: settings.showDebugInfo,
      onChange: (value: boolean) => settings.updateSettings({ showDebugInfo: value }),
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Einstellungen</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-xl text-white mb-2">Anzeigeoptionen</h3>
            <p className="text-gray-400 text-sm mb-4">
              Passe an, welche Informationen während des Spiels angezeigt werden sollen
            </p>
            
            <div className="space-y-2">
              {toggleOptions.map((option) => (
                <Toggle
                  key={option.label}
                  label={option.label}
                  description={option.description}
                  value={option.value}
                  onChange={option.onChange}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};