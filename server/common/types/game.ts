export type GameMode = 'x01' | 'cricket' | 'aroundTheWorld' | 'shanghai' | 'killer' | 'elimination';

export type GameStatus = 'ongoing' | 'finished' | 'abandoned';

export type CheckoutRule = 'straight' | 'double' | 'triple';

export interface BaseGameSettings {
    gameMode: GameMode;
    sets: number;
    legs: number;
}

export interface BaseThrowData {
    gameId: number;
    playerId: number;
    roundNumber: number;
    dartNumber: number;
    score: number;
    multiplier: number;
    busted?: boolean;
    isWinningThrow?: boolean;
}