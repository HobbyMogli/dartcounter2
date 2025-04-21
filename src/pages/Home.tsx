import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common';
import { playerService } from '../services/db';
import Select from 'react-select';
import type { X01Settings as IX01Settings, GameSetupData } from '../types/gameTypes';
import { X01Settings } from '../components/game-settings';

type GameMode = 'x01' | 'cricket' | 'aroundTheWorld' | 'shanghai';

interface GameModeConfig {
  id: GameMode;
  title: string;
  settings: React.ReactNode;
}

interface Player {
  id: number;
  name: string;
  nickname?: string;
}

const CricketSettings: React.FC = () => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">Spielvariante</label>
      <select className="w-full px-4 py-2 bg-dark-700/70 backdrop-blur-md border border-gray-600 rounded-lg text-gray-100">
        <option value="standard">Standard Cricket</option>
        <option value="cutThroat">Cut Throat Cricket</option>
        <option value="hidden">Hidden Cricket</option>
      </select>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">Bull's Eye</label>
      <input type="checkbox" className="form-checkbox h-5 w-5 text-neon-blue" defaultChecked />
      <span className="ml-2 text-sm text-gray-400">Bull's Eye einschließen</span>
    </div>
  </div>
);

const AroundTheWorldSettings: React.FC = () => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">Spielmodus</label>
      <select className="w-full px-4 py-2 bg-dark-700/70 backdrop-blur-md border border-gray-600 rounded-lg text-gray-100">
        <option value="standard">Standard (1-20)</option>
        <option value="reverse">Rückwärts (20-1)</option>
        <option value="random">Zufällige Reihenfolge</option>
      </select>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">Schwierigkeit</label>
      <select className="w-full px-4 py-2 bg-dark-700/70 backdrop-blur-md border border-gray-600 rounded-lg text-gray-100">
        <option value="easy">Einfach (Singles)</option>
        <option value="medium">Mittel (Singles & Doubles)</option>
        <option value="hard">Schwer (Singles, Doubles & Triples)</option>
      </select>
    </div>
  </div>
);

const ShanghaiSettings: React.FC = () => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">Anzahl Runden</label>
      <select className="w-full px-4 py-2 bg-dark-700/70 backdrop-blur-md border border-gray-600 rounded-lg text-gray-100">
        <option value="7">7 Runden (1-7)</option>
        <option value="20">20 Runden (1-20)</option>
      </select>
    </div>
  </div>
);

const GAME_MODES: GameModeConfig[] = [
  {
    id: 'x01',
    title: 'X01',
    settings: null
  },
  {
    id: 'cricket',
    title: 'Cricket',
    settings: <CricketSettings />
  },
  {
    id: 'aroundTheWorld',
    title: 'Around the World',
    settings: <AroundTheWorldSettings />
  },
  {
    id: 'shanghai',
    title: 'Shanghai',
    settings: <ShanghaiSettings />
  }
];

const defaultX01Settings: IX01Settings = {
  startScore: 501,
  sets: 1,
  legs: 3,
  checkIn: 'straight',
  checkOut: 'double'
};

const Home: React.FC = () => {
  const [selectedGameMode, setSelectedGameMode] = useState('x01');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [x01Settings, setX01Settings] = useState<IX01Settings>(defaultX01Settings);
  const [players, setPlayers] = useState<Player[]>([]);
  const navigate = useNavigate();

  // Moved these calculations after useState hooks
  const activeIndex = GAME_MODES.findIndex(m => m.id === selectedGameMode);
  const isFirstActive = activeIndex === 0;
  const isLastActive = activeIndex === GAME_MODES.length - 1;

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        const allPlayers = await playerService.getAllPlayers();
        setPlayers(allPlayers);
      } catch (error) {
        console.error('Fehler beim Laden der Spieler:', error);
      }
    };
    loadPlayers();
  }, []);

  const handleStartGame = () => {
    if (selectedPlayers.length < 2) {
      alert('Bitte wähle mindestens 2 Spieler aus');
      return;
    }

    const gameSetupData: GameSetupData = {
      gameMode: selectedGameMode,
      settings: selectedGameMode === 'x01' ? x01Settings : {},
      players: selectedPlayers
    };

    // Navigiere zur Game-Seite mit den Einstellungen
    navigate('/game', { state: gameSetupData });
  };

  const renderGameSettings = () => {
    switch (selectedGameMode) {
      case 'x01':
        return <X01Settings settings={x01Settings} onSettingsChange={setX01Settings} />;
      // ... andere Cases für andere Spielmodi ...
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Browser-ähnliche Tab-Navigation mit Blur-Effekt */}
      <div className="relative w-fit mx-auto">
        {/* Tab-Leiste mit "Browser-Tabs" und Blur-Effekt */}
        <div className={`grid w-full grid-cols-${GAME_MODES.length}`}>
          {GAME_MODES.map((mode) => (
            <div
              key={mode.id}
              className={`
                relative
                px-4
                py-3
                cursor-pointer
                select-none
                backdrop-blur-md
                border-x-2
                ${selectedGameMode === mode.id
                  ? 'z-10 bg-dark-800/70 text-neon-blue border-t-2 border-neon-blue border-b-0 rounded-t-lg'
                  : 'z-0 bg-dark-900/50 text-gray-400 border-b-2 border-gray-500 border-transparent rounded-t-lg hover:bg-dark-800/60 hover:text-gray-200'
                }
                transition-all duration-200
                text-center
              `}
              onClick={() => setSelectedGameMode(mode.id)}
            >
              <span className="relative z-10">{mode.title}</span>
              {/* Geschwungene Ecken für Browser-Tab-Look */}
              {selectedGameMode === mode.id && (
                <>
                  {/* Ensure no triangle divs remain here */}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Inhalt des aktiven Tabs mit Blur-Effekt - Add relative, border-t, -mt, remove rounded-b */}
        <div className="relative bg-dark-800/70 backdrop-blur-md p-6 border-x-2 border-b-2 border-t-2 border-neon-blue -mt-0.5">
          {/* Removed redundant cover-up divs */}
          
          
          <div className="space-y-6">
            {/* Spielmodus-Einstellungen */}
            <div className="space-y-4">
              <h1 className="text-2xl font-bold text-primary-100 mb-6 text-center">
                Spieleinstellungen
              </h1>
              {renderGameSettings()}
            </div>

            {/* Spielerauswahl mit angepasstem Styling */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-primary-100 mb-6 text-center">Spieler auswählen</h2>
              <Select
                isMulti
                options={players.map(player => ({
                  value: player.id.toString(),
                  label: player.nickname ? `${player.name} (${player.nickname})` : player.name
                }))}
                onChange={(selected) => {
                  const selectedIds = selected.map(option => option.value);
                  setSelectedPlayers(selectedIds);
                }}
                className="react-select-container"
                classNamePrefix="react-select"
                placeholder="Spieler auswählen..."
                noOptionsMessage={() => "Keine Spieler gefunden"}
                styles={{
                  // Anpassung der Select-Komponente für bessere Integration mit dem transparenten Design
                  control: (base) => ({
                    ...base,
                    backgroundColor: 'rgba(17, 24, 39, 0.7)',
                    backdropFilter: 'blur(12px)',
                  }),
                  menu: (base) => ({
                    ...base,
                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                    backdropFilter: 'blur(12px)',
                  }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isFocused 
                      ? 'rgba(59, 130, 246, 0.5)' 
                      : state.isSelected 
                        ? 'rgba(59, 130, 246, 0.8)'
                        : 'transparent',
                  })
                }}
              />
            </div>

            {/* Start-Button */}
            <div className="flex justify-center pt-4">
              <Button
                variant="priority"
                size="lg"
                onClick={handleStartGame}
                disabled={selectedPlayers.length < 2}
                className="min-w-[200px]"
              >
                Spiel starten
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;