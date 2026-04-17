import { buildMegaStats } from './stats';
import type { Draw } from '../types';

export type ScoreBreakdownItem = {
  label: string;
  description: string;
  points: number;
  maxPoints: number;
  matched: boolean;
};

export type BetStatScore = {
  total: number;
  maxTotal: number;
  breakdown: ScoreBreakdownItem[];
};

function getCombinations(values: number[], size: number): number[][] {
  const result: number[][] = [];
  const sorted = [...values].sort((a, b) => a - b);

  function helper(start: number, current: number[]) {
    if (current.length === size) {
      result.push([...current]);
      return;
    }

    for (let i = start; i < sorted.length; i += 1) {
      current.push(sorted[i]);
      helper(i + 1, current);
      current.pop();
    }
  }

  helper(0, []);
  return result;
}

function parseRange(rangeLabel: string): { min: number; max: number } | null {
  const match = rangeLabel.match(/^(\d+)-(\d+)$/);
  if (!match) return null;
  return { min: Number(match[1]), max: Number(match[2]) };
}

function randomBet() {
  const picked = new Set<number>();
  while (picked.size < 6) picked.add(Math.floor(Math.random() * 60) + 1);
  return [...picked].sort((a, b) => a - b);
}

export function evaluateBetStatScore(numbers: number[], draws: Draw[]): BetStatScore {
  const stats = buildMegaStats(draws);
  const maxTotal = 100;

  if (!draws.length || numbers.length !== 6) {
    return { total: 0, maxTotal, breakdown: [] };
  }

  const sortedNumbers = [...numbers].sort((a, b) => a - b);
  const numberSum = sortedNumbers.reduce((acc, num) => acc + num, 0);
  const evens = sortedNumbers.filter((n) => n % 2 === 0).length;
  const odds = 6 - evens;

  const highlightedSumRange = stats.sumDistribution.find((item) => item.highlight);
  const parsedRange = highlightedSumRange ? parseRange(highlightedSumRange.range) : null;
  const sumInHotRange = parsedRange ? numberSum >= parsedRange.min && numberSum <= parsedRange.max : false;

  const pairKeys = new Set(stats.topPairs.map((item) => item.combo.join('-')));
  const tripleKeys = new Set(stats.topTriples.map((item) => item.combo.join('-')));
  const seqKeys = new Set(stats.topConsecutivePairs.map((item) => item.combo.join('-')));

  const betPairs = getCombinations(sortedNumbers, 2).map((combo) => combo.join('-'));
  const betTriples = getCombinations(sortedNumbers, 3).map((combo) => combo.join('-'));

  const matchedPairs = betPairs.filter((key) => pairKeys.has(key)).length;
  const matchedTriples = betTriples.filter((key) => tripleKeys.has(key)).length;
  const matchedSeqPairs = betPairs.filter((key) => seqKeys.has(key)).length;

  const heatFreqByNumber = new Map(stats.heatmap.map((item) => [item.num, item.frequency]));
  const maxFreq = Math.max(1, ...stats.heatmap.map((item) => item.frequency));
  const avgHeatRatio =
    sortedNumbers.reduce((acc, num) => acc + (heatFreqByNumber.get(num) || 0) / maxFreq, 0) / sortedNumbers.length;

  const parityExact = evens === stats.parityPattern.evens && odds === stats.parityPattern.odds;
  const parityNear = Math.abs(evens - stats.parityPattern.evens) === 1;

  const breakdown: ScoreBreakdownItem[] = [
    {
      label: 'Paridade',
      description: `Seu jogo: ${evens}P-${odds}I | Padrao mais recorrente: ${stats.parityPattern.evens}P-${stats.parityPattern.odds}I`,
      points: parityExact ? 20 : parityNear ? 10 : 0,
      maxPoints: 20,
      matched: parityExact || parityNear,
    },
    {
      label: 'Faixa de soma',
      description: `Soma do jogo: ${numberSum} | Faixa mais recorrente: ${highlightedSumRange?.range || '-'}`,
      points: sumInHotRange ? 20 : 0,
      maxPoints: 20,
      matched: sumInHotRange,
    },
    {
      label: 'Pares quentes',
      description: `${matchedPairs} par(es) do jogo aparecem entre os pares mais recorrentes`,
      points: Math.min(20, matchedPairs * 7),
      maxPoints: 20,
      matched: matchedPairs > 0,
    },
    {
      label: 'Trincas quentes',
      description: `${matchedTriples} trinca(s) do jogo aparecem entre as trincas mais recorrentes`,
      points: Math.min(20, matchedTriples * 10),
      maxPoints: 20,
      matched: matchedTriples > 0,
    },
    {
      label: 'Sequencias recorrentes',
      description: `${matchedSeqPairs} par(es) consecutivos do jogo aparecem nas sequencias mais recorrentes`,
      points: Math.min(10, matchedSeqPairs * 5),
      maxPoints: 10,
      matched: matchedSeqPairs > 0,
    },
    {
      label: 'Forca das dezenas',
      description: `Media de frequencia das dezenas do jogo: ${(avgHeatRatio * 100).toFixed(1)}% da maxima`,
      points: Math.round(avgHeatRatio * 10),
      maxPoints: 10,
      matched: avgHeatRatio >= 0.5,
    },
  ];

  const total = breakdown.reduce((acc, item) => acc + item.points, 0);
  return { total, maxTotal, breakdown };
}

export function generateBetByStatWeight(draws: Draw[], maxAttempts = 3000) {
  let bestNumbers = randomBet();
  let bestScore = evaluateBetStatScore(bestNumbers, draws);

  for (let i = 0; i < maxAttempts; i += 1) {
    const candidate = randomBet();
    const score = evaluateBetStatScore(candidate, draws);
    if (score.total > bestScore.total) {
      bestNumbers = candidate;
      bestScore = score;
      if (bestScore.total >= bestScore.maxTotal) break;
    }
  }

  return {
    numbers: bestNumbers,
    score: bestScore,
  };
}
