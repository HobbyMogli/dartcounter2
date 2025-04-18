export interface PlayerStatistics {
  gamesPlayed: number;
  gamesWon: number;
  averageScore: number;
  highestScore: number;
  checkoutPercentage: number;
}

export interface CreatePlayerData {
  name: string;
  nickname?: string;
  statistics?: PlayerStatistics;
}

export interface UpdatePlayerData {
  name: string;
  nickname?: string;
}

export interface Player {
  id: number;
  name: string;
  nickname?: string;
  gamesPlayed: number;
  gamesWon: number;
  averageScore: number;
  highestScore: number;
  checkoutPercentage: number;
  createdAt?: Date;
  favoriteDouble?: number;
  profileImage?: string;
}

export interface PlayerService {
  createPlayer(data: CreatePlayerData): Promise<Player>;
  getAllPlayers(): Promise<Player[]>;
  getPlayerById(id: number): Promise<Player>;
  updatePlayer(playerId: number, data: UpdatePlayerData): Promise<Player>;
  deletePlayer(playerId: number): Promise<void>;
  updatePlayerStatistics(playerId: number, statistics: Partial<PlayerStatistics>): Promise<Player>;
}
