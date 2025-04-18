import React from 'react';
import type { CricketSettings as ICricketSettings } from '../../types/gameTypes';

interface CricketSettingsProps {
  settings: ICricketSettings;
  onSettingsChange: (settings: ICricketSettings) => void;
}

export const CricketSettings: React.FC<CricketSettingsProps> = ({ settings, onSettingsChange }) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">Spielvariante</label>
      <select 
        className="w-full px-4 py-2 bg-dark-700/70 backdrop-blur-md border border-gray-600 rounded-lg text-gray-100"
        value={settings.variant}
        onChange={(e) => onSettingsChange({ ...settings, variant: e.target.value as ICricketSettings['variant'] })}
      >
        <option value="standard">Standard Cricket</option>
        <option value="cutThroat">Cut Throat Cricket</option>
        <option value="hidden">Hidden Cricket</option>
      </select>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">Bull's Eye</label>
      <input 
        type="checkbox" 
        className="form-checkbox h-5 w-5 text-neon-blue" 
        checked={settings.includeBullsEye}
        onChange={(e) => onSettingsChange({ ...settings, includeBullsEye: e.target.checked })}
      />
      <span className="ml-2 text-sm text-gray-400">Bull's Eye einschließen</span>
    </div>
  </div>
);
