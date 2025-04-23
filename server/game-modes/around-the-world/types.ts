import { BaseGameSettings } from '../../common/types/game.js';

export interface AroundTheWorldSettings extends BaseGameSettings {
    mode: 'standard' | 'reverse' | 'random';
    difficulty: 'easy' | 'medium' | 'hard';
}

export interface AroundTheWorldThrowData {
    gameId: number;
    playerId: number;
    roundNumber: number;
    dartNumber: number;
    score: number;
    multiplier: number;
    targetNumber: number;
    isBull: boolean;
}

export interface AroundTheWorldPlayerState {
    playerId: number;
    currentTarget: number;
    completedNumbers: number[];
    position: number;  // Current position in the sequence (1-20)
}