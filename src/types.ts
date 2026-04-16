export type Page = 'stats' | 'games' | 'simulator' | 'finance' | 'time';

export interface Draw {
  id: string;
  concurso: number;
  date: string;
  numbers: number[];
  accumulated: boolean;
  estimatedPrize: string;
}

export interface Session {
  id: string;
  date: string;
  startTime: string;
  duration: string;
}

export interface Game {
  id: string;
  numbers: number[];
  hitFrequency: string;
  lastHit: string;
  analysis: {
    fourPoints: number;
    fourPointsFreq: string;
  };
}

export interface Bet {
  id: string;
  date: string;
  concurso: number;
  betAmount: number;
  winAmount: number;
  balance: number;
}
