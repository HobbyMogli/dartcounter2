import React from 'react';
import type { ShanghaiSettings as IShanghaiSettings } from '../../types/gameTypes';

interface ShanghaiSettingsProps {
  settings: IShanghaiSettings;
  onSettingsChange: (settings: IShanghaiSettings) => void;
}

export const ShanghaiSettings: React.FC<ShanghaiSettingsProps> = ({ settings, onSettingsChange }) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">Anzahl Runden</label>
      <select 
        className="w-full px-4 py-2 bg-dark-700/70 backdrop-blur-md border border-gray-600 rounded-lg text-gray-100"
        value={settings.rounds}
        onChange={(e) => onSettingsChange({ ...settings, rounds: parseInt(e.target.value) as IShanghaiSettings['rounds'] })}
      >
        <option value="7">7 Runden (1-7)</option>
        <option value="20">20 Runden (1-20)</option>
      </select>
    </div>
  </div>
);
