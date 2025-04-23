import { BaseGameService } from '../../common/utils/BaseGameService.js';
import type { AroundTheWorldSettings, AroundTheWorldThrowData, AroundTheWorldPlayerState } from './types.js';
import { PrismaClient } from '@prisma/client';

export class AroundTheWorldGameService extends BaseGameService {
    protected prisma: PrismaClient;

    constructor() {
        super();
        this.prisma = new PrismaClient();
    }

    async validateThrow(throwData: AroundTheWorldThrowData, settings: AroundTheWorldSettings): Promise<{ isValid: boolean; error?: string }> {
        const playerState = await this.getPlayerState(throwData.gameId, throwData.playerId);
        
        // Player must hit their current target to progress
        if (throwData.targetNumber !== playerState.currentTarget) {
            return { isValid: false, error: `Must hit target number ${playerState.currentTarget}` };
        }

        // Validate multiplier based on difficulty
        switch (settings.difficulty) {
            case 'easy':
                if (throwData.multiplier > 1) {
                    return { isValid: false, error: 'Only singles allowed in easy mode' };
                }
                break;
            case 'medium':
                if (throwData.multiplier > 2) {
                    return { isValid: false, error: 'Only singles and doubles allowed in medium mode' };
                }
                break;
            // Hard mode allows all multipliers
        }

        return { isValid: true };
    }

    getCurrentScore = async (gameId: number, playerId: number): Promise<number> => {
        try {
            const playerState = await this.getPlayerState(gameId, playerId);
            return playerState.position; // Score is effectively the player's position
        } catch (error) {
            console.error('Error getting current score:', error);
            throw error;
        }
    }

    async getPlayerState(gameId: number, playerId: number): Promise<AroundTheWorldPlayerState> {
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

        const settings: AroundTheWorldSettings = JSON.parse(game.settings);
        const state: AroundTheWorldPlayerState = {
            playerId,
            currentTarget: 1,
            completedNumbers: [],
            position: 0
        };

        // Process throws to build current state
        game.throws.forEach(t => {
            if (t.targetNumber === state.currentTarget) {
                state.completedNumbers.push(state.currentTarget);
                state.position++;
                // Update next target based on game mode
                if (settings.mode === 'standard') {
                    state.currentTarget = state.position + 1;
                } else if (settings.mode === 'reverse') {
                    state.currentTarget = 20 - state.position;
                } else { // random mode
                    // Get next random number not in completed numbers
                    const available = Array.from({length: 20}, (_, i) => i + 1)
                        .filter(n => !state.completedNumbers.includes(n));
                    state.currentTarget = available[Math.floor(Math.random() * available.length)];
                }
            }
        });

        return state;
    }

    async registerThrow(throwData: AroundTheWorldThrowData): Promise<{ success: boolean; bust?: boolean }> {
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
                    isWinningThrow: throwData.targetNumber === 20 // Winning throw when hitting last number
                }
            });

            return { success: true };
        } catch (error) {
            console.error('Error registering throw:', error);
            return { success: false };
        }
    }

    async getGameSettings(gameId: number): Promise<AroundTheWorldSettings> {
        const game = await this.prisma.game.findUnique({
            where: { id: gameId }
        });

        if (!game) {
            throw new Error('Game not found');
        }

        return JSON.parse(game.settings);
    }
}