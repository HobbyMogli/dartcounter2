import { BaseGameSettings } from '../../common/types/game.js';

export interface CricketSettings extends BaseGameSettings {
    variant: 'standard' | 'cutThroat' | 'hidden';
    includeBullsEye: boolean;
}

export interface CricketThrowData {
    gameId: number;
    playerId: number;
    roundNumber: number;
    dartNumber: number;
    score: number;
    multiplier: number;
    targetNumber: number;
    isBull: boolean;
}

export interface CricketPlayerState {
    playerId: number;
    marks: Map<number, number>;  // Maps target numbers to marks (0-3)
    score: number;
}