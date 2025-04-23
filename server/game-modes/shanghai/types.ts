import { BaseGameSettings } from '../../common/types/game.js';

export interface ShanghaiSettings extends BaseGameSettings {
    rounds: 7 | 20;  // Either play 1-7 or 1-20
}

export interface ShanghaiThrowData {
    gameId: number;
    playerId: number;
    roundNumber: number;
    dartNumber: number;
    score: number;
    multiplier: number;
    targetNumber: number;
    isBull: boolean;
}

export interface ShanghaiPlayerState {
    playerId: number;
    score: number;
    currentRound: number;
    roundScores: Map<number, number>;  // Map round number to score for that round
    shanghaiAchieved: boolean;  // True if player hit single, double, and triple in same round
}