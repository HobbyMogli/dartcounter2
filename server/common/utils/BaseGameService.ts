import pkg from '@prisma/client'; // Reverted import style
const { PrismaClient } = pkg; // Only destructure PrismaClient value if needed, or keep types separate
import { getCurrentScore, getLastThrowDetails, getPlayerThrows } from './game.js';

export abstract class BaseGameService {
    protected prisma: pkg.PrismaClient; // Use pkg.PrismaClient for type

    constructor() {
        this.prisma = new PrismaClient();
    }

    protected getCurrentScore = getCurrentScore;
    protected getLastThrowDetails = getLastThrowDetails;
    protected getPlayerThrows = getPlayerThrows;

    async markRoundBusted(gameId: number, playerId: number, roundNumber: number) {
        const throws = await this.prisma.throw.findMany({
            where: { gameId, playerId, roundNumber }
        });

        const updates: pkg.Throw[] = []; // Use pkg.Throw for type
        for (const throwData of throws) {
            if (!throwData.busted) {
                const updated = await this.prisma.throw.update({
                    where: { id: throwData.id },
                    data: { busted: true }
                });
                updates.push(updated);
            }
        }

        return {
            success: true,
            throws: await this.prisma.throw.findMany({
                where: { gameId, playerId, roundNumber }
            }),
            updatesApplied: updates.length
        };
    }

    async unmarkRoundBusted(gameId: number, playerId: number, roundNumber: number) {
        const throws = await this.prisma.throw.findMany({
            where: { gameId, playerId, roundNumber }
        });

        if (throws.length === 0) {
            return {
                success: false,
                message: 'No throws found to restore',
                throws: []
            };
        }

        const updates: pkg.Throw[] = []; // Use pkg.Throw for type
        for (const throwData of throws) {
            if (throwData.busted) {
                const updated = await this.prisma.throw.update({
                    where: { id: throwData.id },
                    data: { busted: false }
                });
                updates.push(updated);
            }
        }

        const verifiedThrows = await this.prisma.throw.findMany({
            where: { gameId, playerId, roundNumber }
        });

        return {
            success: true,
            throws: verifiedThrows,
            updatesApplied: updates.length
        };
    }
}