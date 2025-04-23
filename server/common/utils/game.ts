import { PrismaClient, Prisma } from '@prisma/client';
import type { BaseThrowData } from '../types/game.js';

const prisma = new PrismaClient();

export async function getCurrentScore(gameId: number, playerId: number): Promise<number> {
    const game = await prisma.game.findUnique({
        where: { id: gameId },
        select: { startingScore: true }
    });

    if (!game) {
        throw new Error('Game not found');
    }

    const throws = await prisma.throw.findMany({
        where: {
            gameId,
            playerId,
            busted: false
        }
    });

    const pointsScored = throws.reduce((total, t) => total + (t.score * t.multiplier), 0);
    return game.startingScore - pointsScored;
}

export async function getLastThrowDetails(gameId: number): Promise<BaseThrowData | null> {
    const lastThrow = await prisma.throw.findFirst({
        where: { gameId },
        orderBy: { id: 'desc' }
    });
    
    return lastThrow;
}

export async function getPlayerThrows(gameId: number, playerId: number, roundNumber?: number) {
    const query: Prisma.ThrowFindManyArgs = {
        where: {
            gameId,
            playerId,
            ...(roundNumber ? { roundNumber } : {})
        },
        orderBy: [
            { roundNumber: Prisma.SortOrder.asc },
            { dartNumber: Prisma.SortOrder.asc }
        ]
    };

    return prisma.throw.findMany(query);
}