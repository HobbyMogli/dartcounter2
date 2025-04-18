import type { PrismaClient } from '@prisma/client';
import { API_URL } from './api';

export interface GameState {
  currentScore: number;
  dartsThrown: number;
  round: number;
  currentDart: number;
  lastThrows: any[]; // TODO: Typ aus Prisma generieren
}

export const gameService = {
  // Neues Spiel erstellen
  async createGame(data: {
    playerId: number;
    gameType: string;
    startingScore: number;
    settings: any; // Die Spieleinstellungen als JSON
  }) {
    try {
      const response = await fetch(`${API_URL}/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to create game: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }
      return response.json();
    } catch (error) {
      console.error('Error creating game:', error);
      throw error;
    }
  },

  // Spiel nach ID abrufen
  async getGameById(id: number) {
    const response = await fetch(`${API_URL}/games/${id}`);
    if (!response.ok) {
      throw new Error('Failed to get game');
    }
    return response.json();
  },

  // Wurf registrieren
  async registerThrow(data: {
    gameId: number;
    playerId: number;
    roundNumber: number;
    dartNumber: number;
    score: number;
    multiplier: number;
    targetNumber?: number;
    isBull?: boolean;
  }) {
    const response = await fetch(`${API_URL}/throws`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error('Failed to register throw');
    }
    return response.json();
  },

  async getLastThrowId(gameId: number) {
    const response = await fetch(`${API_URL}/games/${gameId}/last-throw`);
    if (!response.ok) {
      throw new Error('Failed to get last throw');
    }
    const data = await response.json();
    return data.throwId;
  },

  // Letzten Wurf rückgängig machen
  async undoLastThrow(throwId: number) {
    const response = await fetch(`${API_URL}/throws/${throwId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Failed to undo throw');
    }
    
    // For 204 responses, just return success
    if (response.status === 204) {
      return { success: true };
    }
    
    // For other successful responses, try to parse JSON
    try {
      return response.json();
    } catch {
      return { success: true };
    }
  },

  // Spiel beenden
  async endGame(gameId: number, finalScore: number, dartsThrown: number) {
    const response = await fetch(`${API_URL}/games/${gameId}/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        finalScore,
        dartsThrown
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to end game');
    }
    return response.json();
  }
};