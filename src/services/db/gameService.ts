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
    playerIds: number[];
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
  async endGame(gameId: number, winnerId: number, winningThrowId: number) {
    console.log('Ending game with:', { gameId, winnerId, winningThrowId });
    
    const response = await fetch(`${API_URL}/games/${gameId}/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        winnerId,
        winningThrowId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('End game error response:', errorData);
      throw new Error(`Failed to end game: ${errorData.details || errorData.error}`);
    }

    return response.json();
  },

  // Set the winner of a game
  async setGameWinner(gameId: number, winnerId: number) {
    const response = await fetch(`${API_URL}/games/${gameId}/winner`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        winnerId
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to set game winner');
    }
    return response.json();
  },

  // Spielerstatistiken abrufen
  async getPlayerStats(gameId: number, playerId: number) {
    const response = await fetch(`${API_URL}/games/${gameId}/player-stats/${playerId}`);
    if (!response.ok) {
      throw new Error('Failed to get player stats');
    }
    return response.json();
  },

  // Letzte Würfe eines Spielers abrufen
  async getPlayerThrows(gameId: number, playerId: number, roundNumber?: number) {
    let url = `${API_URL}/games/${gameId}/player-throws/${playerId}`;
    
    // Add round parameter if provided
    if (roundNumber !== undefined) {
      url += `?round=${roundNumber}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to get player throws');
    }
    return response.json();
  },

  // Mark a round as busted
  async markRoundAsBusted(gameId: number, playerId: number, roundNumber: number) {
    const response = await fetch(`${API_URL}/games/${gameId}/mark-round-busted`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerId,
        roundNumber
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to mark round as busted');
    }
    return response.json();
  },
  
  // Unmark a round as busted (restore throws to normal state)
  async unmarkRoundAsBusted(gameId: number, playerId: number, roundNumber: number) {
    const response = await fetch(`${API_URL}/games/${gameId}/unmark-round-busted`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerId,
        roundNumber
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to restore round from busted state');
    }
    return response.json();
  },

  // Get the highest round number used in a game
  async getHighestRound(gameId: number): Promise<number> {
    try {
      const response = await fetch(`${API_URL}/games/${gameId}/highest-round`);
      
      if (!response.ok) {
        console.error(`Failed to get highest round for game ${gameId}: ${response.status} ${response.statusText}`);
        return 1; // Default to round 1 if API call fails
      }
      
      const data = await response.json();
      return data.highestRound || 1;
    } catch (error) {
      console.error('Error getting highest round:', error instanceof Error ? error.message : error);
      return 1; // Default to round 1 if error occurs
    }
  }
};