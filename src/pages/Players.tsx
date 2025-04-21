import React, { useEffect, useState } from 'react';
import { Card, Button } from '../components/common';
import { playerService } from '../services/db';
import AddPlayerModal from '../components/players/AddPlayerModal';
import { FiInfo, FiSettings, FiTrash2 } from 'react-icons/fi';
import EditPlayerModal from '../components/players/EditPlayerModal';
import DeletePlayerModal from '../components/players/DeletePlayerModal';
import { Player } from '../services/db/types';

const Players: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      console.log('Lade Spieler...');
      const data = await playerService.getAllPlayers();
      console.log('Geladene Spieler:', data);
      setPlayers(data);
      setError(null);
    } catch (error) {
      console.error('Fehler beim Laden der Spieler:', error);
      setError('Fehler beim Laden der Spieler');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPlayer = async (playerData: { name: string; nickname?: string }) => {
    try {
      await playerService.createPlayer({
        name: playerData.name,
        nickname: playerData.nickname,
        statistics: {
          gamesPlayed: 0,
          gamesWon: 0,
          averageScore: 0,
          highestScore: 0,
          checkoutPercentage: 0
        }
      });
      // Nach erfolgreichem Hinzufügen die Liste neu laden
      await loadPlayers();
    } catch (error) {
      console.error('Fehler beim Erstellen des Spielers:', error);
      throw error; // Weitergeben an das Modal zur Fehlerbehandlung
    }
  };

  const handleEditPlayer = async (playerId: number, data: { name: string; nickname?: string }) => {
    try {
      console.log('Versuche Spieler zu aktualisieren:', playerId, data); // Debug-Log
      await playerService.updatePlayer(playerId, data);
      console.log('Spieler erfolgreich aktualisiert'); // Debug-Log
      await loadPlayers(); // Liste neu laden
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Spielers:', error);
      throw error;
    }
  };

  const handleDeletePlayer = async (playerId: number) => {
    try {
      console.log('Versuche Spieler zu löschen:', playerId); // Debug-Log
      await playerService.deletePlayer(playerId);
      console.log('Spieler erfolgreich gelöscht'); // Debug-Log
      await loadPlayers(); // Liste neu laden
    } catch (error) {
      console.error('Fehler beim Löschen des Spielers:', error);
      throw error;
    }
  };

  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.nickname?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-center items-center">
        <h1 className="text-3xl font-bold text-primary-100">Spielerverwaltung</h1>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-500">
          {error}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="mx-auto p-4 border-b border-gray-700 flex justify-between items-center space-x-7">
          <input
            type="text"
            placeholder="Spieler suchen..."
            className="w-full px-4 py-2 bg-dark-800 border border-gray-700 rounded-lg text-gray-300 transition-all duration-300 hover:border-neon-blue hover:glow-blue"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button 
          variant="priority" 
          size="md"
          onClick={() => setIsAddModalOpen(true)}
          className="whitespace-nowrap"
          >
          Neuer Spieler
          </Button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-neon-blue mx-auto"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Spiele</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Gewonnen</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Ø Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Höchster Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Checkout %</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredPlayers.map((player) => (
                  <tr key={player.id} className="hover:bg-dark-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-200">{player.name}</div>
                        {player.nickname && (
                          <div className="text-sm text-gray-400">{player.nickname}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {player.gamesPlayed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {player.gamesWon}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {player.averageScore.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {player.highestScore}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {player.checkoutPercentage.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<FiInfo />}
                        onClick={() => {/* TODO: Details-Ansicht */}}
                        className="tooltip"
                        aria-label="Details anzeigen"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<FiSettings />}
                        onClick={() => {
                          setSelectedPlayer(player);
                          setIsEditModalOpen(true);
                        }}
                        className="tooltip"
                        aria-label="Spieler bearbeiten"
                      />
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<FiTrash2 />}
                        onClick={() => {
                          setSelectedPlayer(player);
                          setIsDeleteModalOpen(true);
                        }}
                        className="tooltip"
                        aria-label="Spieler löschen"
                      />
                    </td>
                  </tr>
                ))}
                {filteredPlayers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-400">
                      Keine Spieler gefunden
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AddPlayerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddPlayer}
      />

      {selectedPlayer && (
        <>
          <EditPlayerModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedPlayer(null);
            }}
            onEdit={handleEditPlayer}
            player={selectedPlayer}
          />
          <DeletePlayerModal
            isOpen={isDeleteModalOpen}
            onClose={() => {
              setIsDeleteModalOpen(false);
              setSelectedPlayer(null);
            }}
            onDelete={handleDeletePlayer}
            player={selectedPlayer}
          />
        </>
      )}
    </div>
  );
};

export default Players;