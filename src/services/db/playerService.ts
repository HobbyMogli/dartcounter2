import { 
  PlayerService, 
  CreatePlayerData, 
  UpdatePlayerData, 
  Player,
  PlayerStatistics 
} from './types';

const API_URL = 'http://localhost:3001/api';

export const playerService: PlayerService = {
  // Spieler erstellen
  async createPlayer(data: CreatePlayerData): Promise<Player> {
    const response = await fetch(`${API_URL}/players`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: data.name,
        nickname: data.nickname,
        gamesPlayed: data.statistics?.gamesPlayed ?? 0,
        gamesWon: data.statistics?.gamesWon ?? 0,
        averageScore: data.statistics?.averageScore ?? 0,
        highestScore: data.statistics?.highestScore ?? 0,
        checkoutPercentage: data.statistics?.checkoutPercentage ?? 0
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to create player');
    }
    return response.json();
  },

  // Alle Spieler abrufen
  async getAllPlayers(): Promise<Player[]> {
    const response = await fetch(`${API_URL}/players`);
    if (!response.ok) {
      throw new Error('Failed to fetch players');
    }
    return response.json();
  },

  // Spieler nach ID finden
  async getPlayerById(id: number): Promise<Player> {
    const response = await fetch(`${API_URL}/players/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch player');
    }
    return response.json();
  },

  // Spieler aktualisieren
  async updatePlayer(playerId: number, data: UpdatePlayerData): Promise<Player> {
    const response = await fetch(`${API_URL}/players/${playerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update player');
    }
    return response.json();
  },

  // Spieler löschen
  async deletePlayer(playerId: number): Promise<void> {
    const response = await fetch(`${API_URL}/players/${playerId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete player');
    }
  },

  // Spielerstatistiken aktualisieren
  async updatePlayerStatistics(playerId: number, statistics: Partial<PlayerStatistics>): Promise<Player> {
    const response = await fetch(`${API_URL}/players/${playerId}/statistics`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(statistics)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update player statistics');
    }
    return response.json();
  }
};