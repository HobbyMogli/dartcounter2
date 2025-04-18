import prisma from './prisma';

type PlayerCreateInput = {
  name: string;
  nickname?: string;
};

type PlayerStatsUpdate = {
  gamesPlayed?: number;
  gamesWon?: number;
  averageScore?: number;
  highestScore?: number;
  checkoutPercentage?: number;
};

export const playerService = {
  // Spieler erstellen
  async createPlayer(data: PlayerCreateInput) {
    return prisma.player.create({
      data
    });
  },

  // Alle Spieler abrufen
  async getAllPlayers() {
    return prisma.player.findMany({
      orderBy: {
        name: 'asc'
      }
    });
  },

  // Spieler nach ID finden
  async getPlayerById(id: number) {
    return prisma.player.findUnique({
      where: { id },
      include: {
        gamePlayers: true,
        wonGames: true
      }
    });
  },

  // Spielerstatistiken aktualisieren
  async updatePlayerStats(id: number, stats: PlayerStatsUpdate) {
    return prisma.player.update({
      where: { id },
      data: stats
    });
  }
};