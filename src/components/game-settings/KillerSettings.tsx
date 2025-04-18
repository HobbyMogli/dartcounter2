import React from 'react';
import type { KillerSettings as IKillerSettings } from '../../types/gameTypes';

interface KillerSettingsProps {
  settings: IKillerSettings;
  onSettingsChange: (settings: IKillerSettings) => void;
}

export const KillerSettings: React.FC<KillerSettingsProps> = ({ settings, onSettingsChange }) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">Leben</label>
      <select 
        className="w-full px-4 py-2 bg-dark-700/70 backdrop-blur-md border border-gray-600 rounded-lg text-gray-100"
        value={settings.lives}
        onChange={(e) => onSettingsChange({ ...settings, lives: parseInt(e.target.value) })}
      >
        {[3, 5, 7, 10].map(lives => (
          <option key={lives} value={lives}>{lives} Leben</option>
        ))}
      </select>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">Schwierigkeit</label>
      <select 
        className="w-full px-4 py-2 bg-dark-700/70 backdrop-blur-md border border-gray-600 rounded-lg text-gray-100"
        value={settings.difficulty}
        onChange={(e) => onSettingsChange({ ...settings, difficulty: e.target.value as IKillerSettings['difficulty'] })}
      >
        <option value="easy">Einfach (Singles)</option>
        <option value="medium">Mittel (Singles & Doubles)</option>
        <option value="hard">Schwer (Singles, Doubles & Triples)</option>
      </select>
    </div>
  </div>
); 