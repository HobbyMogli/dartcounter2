import type { PrismaClient } from '@prisma/client';
import { prisma } from './prisma';

export const gameService = {
  // Neues Spiel erstellen
  async createGame(data: {
    playerIds: number[];
    gameType: string;
    startingScore: number;
  }) {
    return prisma.$transaction(async (prismaClient: PrismaClient) => {
      const game = await prismaClient.game.create({
        data: {
          gameType: data.gameType,
          startingScore: data.startingScore,
          status: 'IN_PROGRESS',
          players: {
            create: data.playerIds.map(playerId => ({
              player: {
                connect: { id: playerId }
              }
            }))
          }
        },
        include: {
          players: {
            include: {
              player: true
            }
          }
        }
      });
      return game;
    });
  },

  // Spiel nach ID abrufen
  async getGameById(id: number) {
    return prisma.game.findUnique({
      where: { id },
      include: {
        players: {
          include: {
            player: true
          }
        },
        throws: true,
        winner: true
      }
    });
  },

  // Wurf registrieren
  async registerThrow(data: {
    gameId: number;
    playerId: number;
    score: number;
    multiplier: number;
    sector: number;
  }) {
    return prisma.throw.create({
      data: {
        gameId: data.gameId,
        playerId: data.playerId,
        score: data.score,
        multiplier: data.multiplier,
        sector: data.sector
      }
    });
  }
};