export type Page = 'stats' | 'games' | 'simulator' | 'finance' | 'time';

export interface Draw {
  id: string;
  concurso: number;
  date: string;
  numbers: number[];
  winners6: number;
  cityUf: string;
  prize6: number;
  winners5: number;
  prize5: number;
  winners4: number;
  prize4: number;
  accumulated6: number;
  totalRevenue: number;
  estimatedPrize: number;
  megaDaViradaAccumulated: number;
  observation: string;
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
