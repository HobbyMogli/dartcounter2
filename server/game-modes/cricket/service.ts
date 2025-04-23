import { BaseGameService } from '../../common/utils/BaseGameService.js';
import type { CricketSettings, CricketThrowData, CricketPlayerState } from './types.js';
import { PrismaClient } from '@prisma/client';

export class CricketGameService extends BaseGameService {
    protected prisma: PrismaClient;
    private readonly CRICKET_NUMBERS = [15, 16, 17, 18, 19, 20];

    constructor() {
        super();
        this.prisma = new PrismaClient();
    }

    async validateThrow(throwData: CricketThrowData, settings: CricketSettings): Promise<{ isValid: boolean; error?: string }> {
        // Only allow throws at valid cricket numbers or bull
        if (!this.CRICKET_NUMBERS.includes(throwData.targetNumber) && !throwData.isBull) {
            return { isValid: false, error: 'Invalid target number for Cricket' };
        }

        // If bull's eye is not included in settings, disallow bull throws
        if (throwData.isBull && !settings.includeBullsEye) {
            return { isValid: false, error: 'Bull\'s eye is not enabled for this game' };
        }

        return { isValid: true };
    }

    getCurrentScore = async (gameId: number, playerId: number): Promise<number> => {
        try {
            const playerState = await this.getPlayerState(gameId, playerId);
            return playerState.score;
        } catch (error) {
            console.error('Error getting current score:', error);
            throw error;
        }
    }

    async getPlayerState(gameId: number, playerId: number): Promise<CricketPlayerState> {
        const throws = await this.prisma.throw.findMany({
            where: {
                gameId,
                playerId,
                busted: false
            },
            orderBy: [
                { roundNumber: 'asc' },
                { dartNumber: 'asc' }
            ]
        });

        const state: CricketPlayerState = {
            playerId,
            marks: new Map(),
            score: 0
        };

        // Initialize marks for all cricket numbers
        this.CRICKET_NUMBERS.forEach(num => state.marks.set(num, 0));

        // Process throws to build current state
        throws.forEach(t => {
            if (t.targetNumber !== null && this.CRICKET_NUMBERS.includes(t.targetNumber)) {
                const currentMarks = state.marks.get(t.targetNumber) ?? 0;
                state.marks.set(t.targetNumber, Math.min(currentMarks + t.multiplier, 3));
            }
        });

        return state;
    }

    async registerThrow(throwData: CricketThrowData): Promise<{ success: boolean; bust?: boolean }> {
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
                    isBull: throwData.isBull,
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

    async getGameSettings(gameId: number): Promise<CricketSettings> {
        const game = await this.prisma.game.findUnique({
            where: { id: gameId }
        });

        if (!game) {
            throw new Error('Game not found');
        }

        return JSON.parse(game.settings);
    }
}