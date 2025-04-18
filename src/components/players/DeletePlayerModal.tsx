import React, { useState } from 'react';
import { Button } from '../common';

interface DeletePlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: (playerId: number) => Promise<void>;
  player: {
    id: number;
    name: string;
  };
}

const DeletePlayerModal: React.FC<DeletePlayerModalProps> = ({ isOpen, onClose, onDelete, player }) => {
  const [confirmText, setConfirmText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isConfirmed = confirmText === player.name;

  const handleDelete = async () => {
    if (!isConfirmed) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onDelete(player.id);
      onClose();
    } catch (err) {
      setError('Fehler beim Löschen des Spielers');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-dark-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Spieler löschen</h2>
          <div className="space-y-4">
            <p className="text-gray-300">
              Möchten Sie den Spieler <span className="font-bold">{player.name}</span> wirklich löschen?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-red-500 text-sm">
              <p>⚠️ Warnung:</p>
              <ul className="list-disc list-inside mt-2">
                <li>Alle Spielstatistiken werden gelöscht</li>
                <li>Spielergebnisse werden anonymisiert</li>
                <li>Diese Aktion ist endgültig</li>
              </ul>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Geben Sie den Namen "{player.name}" ein, um das Löschen zu bestätigen:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-500 text-sm">
              {error}
            </div>
          )}

          <div className="mt-6 flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={onClose}
            >
              Abbrechen
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={!isConfirmed || isSubmitting}
            >
              {isSubmitting ? 'Wird gelöscht...' : 'Endgültig löschen'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeletePlayerModal;
