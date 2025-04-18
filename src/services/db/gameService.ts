import type { PrismaClient } from '@prisma/client';
import prisma from './prisma';

type GameCreateInput = {
  gameType: string;
  settings: Record<string, any>;
  players: { id: number; position: number; }[];
};

type ThrowCreateInput = {
  gameId: number;
  playerId: number;
  round: number;
  throwNumber: number;
  segment: number;
  multiplier: number;
  score: number;
  remainingScore: number;
};

export const gameService = {
  // Neues Spiel erstellen
  async createGame(data: GameCreateInput) {
    return prisma.$transaction(async (prismaClient: PrismaClient) => {
      // Spiel erstellen
      const game = await prismaClient.game.create({
        data: {
          gameType: data.gameType,
          settings: JSON.stringify(data.settings),
        }
      });

      // Spieler zum Spiel hinzufügen
      const gamePlayers = await Promise.all(
        data.players.map(player =>
          prismaClient.gamePlayer.create({
            data: {
              gameId: game.id,
              playerId: player.id,
              position: player.position
            }
          })
        )
      );

      return { ...game, gamePlayers };
    });
  },

  // Spiel nach ID abrufen
  async getGameById(id: number) {
    return prisma.game.findUnique({
      where: { id },
      include: {
        gamePlayers: {
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
  async registerThrow(data: ThrowCreateInput) {
    return prisma.throw.create({
      data
    });
  }
};