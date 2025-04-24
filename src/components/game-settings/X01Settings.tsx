import React from 'react';
import type { X01Settings as IX01Settings } from '../../types/gameTypes';

interface X01SettingsProps {
  settings: IX01Settings;
  onSettingsChange: (settings: IX01Settings) => void;
}

export const X01Settings: React.FC<X01SettingsProps> = ({ settings, onSettingsChange }) => {
  const handleChange = (field: keyof IX01Settings, value: any) => {
    onSettingsChange({
      ...settings,
      [field]: value,
    });
  };

  // Helper function to generate number options
  const generateOptions = (start: number, end: number) => 
    Array.from({ length: end - start + 1 }, (_, i) => ({
      value: start + i,
      label: `${start + i}`
    }));

  return (
    <div className="space-y-4">
      {/* Top row with three dropdowns */}
      <div className="grid grid-cols-3 gap-4">
        {/* Start Score */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Start Score</label>
          <select
            className="w-full px-4 py-2 bg-dark-700/70 backdrop-blur-md border border-gray-600 rounded-lg text-gray-100"
            value={settings.startScore}
            onChange={(e) => handleChange('startScore', parseInt(e.target.value))}
          >
            <option value="101">101</option>
            <option value="301">301</option>
            <option value="501">501</option>
            <option value="701">701</option>
            <option value="1001">1001</option>
          </select>
        </div>

        {/* Sets */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Sets</label>
          <select
            className="w-full px-4 py-2 bg-dark-700/70 backdrop-blur-md border border-gray-600 rounded-lg text-gray-100"
            value={settings.sets}
            onChange={(e) => handleChange('sets', parseInt(e.target.value))}
          >
            {generateOptions(1, 20).map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Legs */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Legs</label>
          <select
            className="w-full px-4 py-2 bg-dark-700/70 backdrop-blur-md border border-gray-600 rounded-lg text-gray-100"
            value={settings.legs}
            onChange={(e) => handleChange('legs', parseInt(e.target.value))}
          >
            {generateOptions(1, 20).map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bottom row with two dropdowns */}
      <div className="grid grid-cols-2 gap-4">
        {/* Check-In */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Check-In</label>
          <select
            className="w-full px-4 py-2 bg-dark-700/70 backdrop-blur-md border border-gray-600 rounded-lg text-gray-100"
            value={settings.checkIn}
            onChange={(e) => handleChange('checkIn', e.target.value)}
          >
            <option value="straight">Straight-In</option>
            <option value="double">Double-In</option>
            <option value="triple">Triple-In</option>
          </select>
        </div>

        {/* Check-Out */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Check-Out</label>
          <select
            className="w-full px-4 py-2 bg-dark-700/70 backdrop-blur-md border border-gray-600 rounded-lg text-gray-100"
            value={settings.checkOut}
            onChange={(e) => handleChange('checkOut', e.target.value)}
          >
            <option value="straight">Straight-Out</option>
            <option value="double">Double-Out</option>
            <option value="triple">Triple-Out</option>
          </select>
        </div>
      </div>
    </div>
  );
};
