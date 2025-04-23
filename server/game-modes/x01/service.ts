import { BaseGameService } from '../../common/utils/BaseGameService.js';
import { isX01CheckoutPossible, isX01CheckoutScoreValid } from './logic.js';
import type { X01Settings, X01ThrowData } from './types.js';
import { PrismaClient, Prisma } from '@prisma/client';

export class X01GameService extends BaseGameService {
    protected prisma: PrismaClient;

    constructor() {
        super();
        this.prisma = new PrismaClient();
    }

    async validateThrow(throwData: X01ThrowData, settings: X01Settings): Promise<{ isValid: boolean; error?: string }> {
        const currentScore = await this.getCurrentScore(throwData.gameId, throwData.playerId);
        const newScore = currentScore - (throwData.score * throwData.multiplier);

        // Check for bust conditions
        if (newScore < 0) {
            return { isValid: false, error: 'Score would go below zero' };
        }

        // Check for impossible checkouts
        if (newScore > 0) {
            if (settings.checkOut === 'double' && newScore < 2) {
                return { isValid: false, error: 'Score cannot be checked out with a double' };
            }
            if (settings.checkOut === 'triple' && newScore < 3) {
                return { isValid: false, error: 'Score cannot be checked out with a triple' };
            }
        }

        // Check if this would be a winning throw
        if (newScore === 0) {
            if (!this.isValidCheckout(throwData, settings)) {
                return { isValid: false, error: `Game must be finished with a ${settings.checkOut}` };
            }
        }

        return { isValid: true };
    }

    private isValidCheckout(throwData: X01ThrowData, settings: X01Settings): boolean {
        switch (settings.checkOut) {
            case 'double':
                return throwData.multiplier === 2;
            case 'triple':
                return throwData.multiplier === 3;
            case 'straight':
                return true;
            default:
                return false;
        }
    }

    getCurrentScore = async (gameId: number, playerId: number): Promise<number> => {
        try {
            // Get the game to find the starting score
            const game = await this.prisma.game.findUnique({
                where: { id: gameId },
                include: {
                    throws: {
                        where: {
                            playerId,
                            busted: false // Only consider non-busted throws
                        },
                        select: {
                            score: true,
                            multiplier: true
                        }
                    }
                }
            });

            if (!game) {
                throw new Error('Game not found');
            }

            // Calculate current score by subtracting all valid throws
            const totalPoints = game.throws.reduce((sum, t) => sum + (t.score * t.multiplier), 0);
            return game.startingScore - totalPoints;
        } catch (error) {
            console.error('Error calculating current score:', error);
            throw error;
        }
    }

    async registerThrow(throwData: X01ThrowData): Promise<{ success: boolean; bust?: boolean }> {
        try {
            const throw_ = await this.prisma.throw.create({
                data: {
                    gameId: throwData.gameId,
                    playerId: throwData.playerId,
                    roundNumber: throwData.roundNumber,
                    dartNumber: throwData.dartNumber,
                    score: throwData.score,
                    multiplier: throwData.multiplier,
                    targetNumber: throwData.targetNumber,
                    isBull: throwData.isBull || false,
                    busted: false,
                    isWinningThrow: false
                }
            });

            return { success: true };
        } catch (error) {
            console.error('Error registering throw:', error);
            return { success: false };
        }
    }

    async getGameSettings(gameId: number): Promise<X01Settings> {
        const game = await this.prisma.game.findUnique({
            where: { id: gameId }
        });

        if (!game) {
            throw new Error('Game not found');
        }

        return JSON.parse(game.settings);
    }
}