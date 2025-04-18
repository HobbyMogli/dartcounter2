import React from 'react';
import type { EliminationSettings as IEliminationSettings } from '../../types/gameTypes';

interface EliminationSettingsProps {
  settings: IEliminationSettings;
  onSettingsChange: (settings: IEliminationSettings) => void;
}

export const EliminationSettings: React.FC<EliminationSettingsProps> = ({ settings, onSettingsChange }) => (
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
      <label className="block text-sm font-medium text-gray-300 mb-2">Zielpunktzahl</label>
      <select 
        className="w-full px-4 py-2 bg-dark-700/70 backdrop-blur-md border border-gray-600 rounded-lg text-gray-100"
        value={settings.targetScore}
        onChange={(e) => onSettingsChange({ ...settings, targetScore: parseInt(e.target.value) })}
      >
        {[20, 30, 40, 50].map(score => (
          <option key={score} value={score}>{score} Punkte</option>
        ))}
      </select>
    </div>
  </div>
); 