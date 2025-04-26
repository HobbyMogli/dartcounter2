import { 
  PlayerService, 
  CreatePlayerData, 
  UpdatePlayerData, 
  Player,
  PlayerStatistics 
} from './types';
import { API_URL } from './api.ts';

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
    console.log('Fetching all players from:', `${API_URL}/players`);
    try {
      const response = await fetch(`${API_URL}/players`);
      console.log('getAllPlayers response status:', response.status);
      
      if (!response.ok) {
        console.error('Error fetching players:', response.status, response.statusText);
        throw new Error(`Failed to fetch players: ${response.status} ${response.statusText}`);
      }
      
      // First get the raw text to debug any JSON parsing issues
      const rawText = await response.text();
      
      try {
        // Then parse it manually
        console.log('Raw player response preview:', rawText.substring(0, 200) + '...');
        const players = JSON.parse(rawText);
        
        // Validate the data structure we received
        if (!Array.isArray(players)) {
          console.error('Players API did not return an array:', players);
          throw new Error('Invalid player data format');
        }
        
        console.log(`Successfully loaded ${players.length} players`);
        return players;
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Raw response was:', rawText);
        throw new Error('Failed to parse player data');
      }
    } catch (error) {
      console.error('Exception in getAllPlayers:', error);
      throw error;
    }
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
  async deletePlayer(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/players/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      // For status 204 (no content), treat as success
      if (response.status === 204) {
        return;
      }
      // Otherwise try to get error details
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to delete player: ${errorData.error}`);
    }
    // For successful deletion with no content
    if (response.status === 204) {
      return;
    }
    // If there's content, parse it (though we don't expect any for DELETE)
    await response.json();
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