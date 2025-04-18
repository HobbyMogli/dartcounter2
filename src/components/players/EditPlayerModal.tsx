import React, { useState } from 'react';
import { Button } from '../common';

interface EditPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (playerId: number, playerData: { name: string; nickname?: string }) => Promise<void>;
  player: {
    id: number;
    name: string;
    nickname?: string;
  };
}

const EditPlayerModal: React.FC<EditPlayerModalProps> = ({ isOpen, onClose, onEdit, player }) => {
  const [name, setName] = useState(player.name);
  const [nickname, setNickname] = useState(player.nickname || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name ist erforderlich');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onEdit(player.id, {
        name: name.trim(),
        nickname: nickname.trim() || undefined
      });
      onClose();
    } catch (err) {
      setError('Fehler beim Aktualisieren des Spielers');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-dark-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-neon-blue mb-4">Spieler bearbeiten</h2>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-neon-blue focus:glow-blue-sm"
                />
              </div>
              <div>
                <label htmlFor="nickname" className="block text-sm font-medium text-gray-300 mb-1">
                  Spitzname (optional)
                </label>
                <input
                  type="text"
                  id="nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-neon-blue focus:glow-blue-sm"
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
                variant="priority"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Wird gespeichert...' : 'Speichern'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditPlayerModal;
