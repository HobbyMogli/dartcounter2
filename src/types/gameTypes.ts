export interface X01Settings {
  startScore: 301 | 501 | 701 | 1001;
  sets: number;
  legs: number;
  checkIn: 'straight' | 'double' | 'triple';
  checkOut: 'straight' | 'double' | 'triple';
}

export interface CricketSettings {
  variant: 'standard' | 'cutThroat' | 'hidden';
  includeBullsEye: boolean;
}

export interface AroundTheWorldSettings {
  mode: 'standard' | 'reverse' | 'random';
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface ShanghaiSettings {
  rounds: 7 | 20;
}

export interface KillerSettings {
  lives: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface EliminationSettings {
  lives: number;
  targetScore: number;
}

export type GameSettings = {
  x01: X01Settings;
  cricket: CricketSettings;
  aroundTheWorld: AroundTheWorldSettings;
  shanghai: ShanghaiSettings;
  killer: KillerSettings;
  elimination: EliminationSettings;
};

export interface GameSetupData {
  gameMode: string;
  settings: X01Settings | any; // We'll add other game settings types later
  players: string[];
}
