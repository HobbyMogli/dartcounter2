import { BaseGameService } from '../../common/utils/BaseGameService.js';
import type { ShanghaiSettings, ShanghaiThrowData, ShanghaiPlayerState } from './types.js';
import { PrismaClient, Throw } from '@prisma/client';

export class ShanghaiGameService extends BaseGameService {
    protected prisma: PrismaClient;

    constructor() {
        super();
        this.prisma = new PrismaClient();
    }

    async validateThrow(throwData: ShanghaiThrowData, settings: ShanghaiSettings): Promise<{ isValid: boolean; error?: string }> {
        // Player must hit their current target number (which is the round number)
        if (throwData.targetNumber !== throwData.roundNumber) {
            return { isValid: false, error: `Must hit target number ${throwData.roundNumber} in this round` };
        }

        // All multipliers are valid in Shanghai, as you need different ones to achieve Shanghai
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

    async getPlayerState(gameId: number, playerId: number): Promise<ShanghaiPlayerState> {
        const game = await this.prisma.game.findUnique({
            where: { id: gameId },
            include: {
                throws: {
                    where: {
                        playerId,
                        busted: false
                    },
                    orderBy: [
                        { roundNumber: 'asc' },
                        { dartNumber: 'asc' }
                    ]
                }
            }
        });

        if (!game) {
            throw new Error('Game not found');
        }

        const state: ShanghaiPlayerState = {
            playerId,
            score: 0,
            currentRound: 1,
            roundScores: new Map(),
            shanghaiAchieved: false
        };

        // Group throws by round
        const throwsByRound = new Map<number, Throw[]>();
        game.throws.forEach(t => {
            if (!throwsByRound.has(t.roundNumber)) {
                throwsByRound.set(t.roundNumber, []);
            }
            const roundThrows = throwsByRound.get(t.roundNumber);
            if (roundThrows) {
                roundThrows.push(t);
            }
        });

        // Process each round
        throwsByRound.forEach((throws, roundNumber) => {
            // Calculate round score
            const roundScore = throws.reduce((sum, t) => sum + (t.score * t.multiplier), 0);
            state.roundScores.set(roundNumber, roundScore);
            state.score += roundScore;

            // Check for Shanghai (single, double, triple in same round)
            const multipliers = new Set(throws.map(t => t.multiplier));
            if (multipliers.has(1) && multipliers.has(2) && multipliers.has(3)) {
                state.shanghaiAchieved = true;
            }

            // Update current round to the highest round number + 1
            state.currentRound = Math.max(state.currentRound, roundNumber + 1);
        });

        return state;
    }

    async registerThrow(throwData: ShanghaiThrowData): Promise<{ success: boolean; bust?: boolean }> {
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

            // Check if this throw achieved Shanghai
            const roundThrows = await this.prisma.throw.findMany({
                where: {
                    gameId: throwData.gameId,
                    playerId: throwData.playerId,
                    roundNumber: throwData.roundNumber,
                    busted: false
                }
            });

            const multipliers = new Set(roundThrows.map(t => t.multiplier));
            const isShanghai = multipliers.has(1) && multipliers.has(2) && multipliers.has(3);

            // If Shanghai was achieved, this is an instant win
            if (isShanghai) {
                await this.prisma.throw.update({
                    where: { id: throw_.id },
                    data: { isWinningThrow: true }
                });
            }

            return { success: true };
        } catch (error) {
            console.error('Error registering throw:', error);
            return { success: false };
        }
    }

    async getGameSettings(gameId: number): Promise<ShanghaiSettings> {
        const game = await this.prisma.game.findUnique({
            where: { id: gameId }
        });

        if (!game) {
            throw new Error('Game not found');
        }

        return JSON.parse(game.settings);
    }
}