import type { BaseGameSettings, BaseThrowData, CheckoutRule } from '../../common/types/game.ts';

export interface X01Settings extends BaseGameSettings {
    startScore: 301 | 501 | 701 | 1001;
    checkIn: CheckoutRule;
    checkOut: CheckoutRule;
}

export interface X01ThrowData extends BaseThrowData {
    targetNumber?: number;
    isBull?: boolean;
}

export interface X01GameState {
    currentScore: number;
    dartsThrown: number;
    round: number;
    currentDart: number;
    lastThrows: X01ThrowData[];
    checkoutOpportunities: number;
    successfulCheckouts: number;
}