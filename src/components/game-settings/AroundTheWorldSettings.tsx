import React from 'react';
import type { AroundTheWorldSettings as IAroundTheWorldSettings } from '../../types/gameTypes';

interface AroundTheWorldSettingsProps {
  settings: IAroundTheWorldSettings;
  onSettingsChange: (settings: IAroundTheWorldSettings) => void;
}

export const AroundTheWorldSettings: React.FC<AroundTheWorldSettingsProps> = ({ settings, onSettingsChange }) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">Spielmodus</label>
      <select 
        className="w-full px-4 py-2 bg-dark-700/70 backdrop-blur-md border border-gray-600 rounded-lg text-gray-100"
        value={settings.mode}
        onChange={(e) => onSettingsChange({ ...settings, mode: e.target.value as IAroundTheWorldSettings['mode'] })}
      >
        <option value="standard">Standard (1-20)</option>
        <option value="reverse">Rückwärts (20-1)</option>
        <option value="random">Zufällige Reihenfolge</option>
      </select>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">Schwierigkeit</label>
      <select 
        className="w-full px-4 py-2 bg-dark-700/70 backdrop-blur-md border border-gray-600 rounded-lg text-gray-100"
        value={settings.difficulty}
        onChange={(e) => onSettingsChange({ ...settings, difficulty: e.target.value as IAroundTheWorldSettings['difficulty'] })}
      >
        <option value="easy">Einfach (Singles)</option>
        <option value="medium">Mittel (Singles & Doubles)</option>
        <option value="hard">Schwer (Singles, Doubles & Triples)</option>
      </select>
    </div>
  </div>
);
