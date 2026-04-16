import type { Draw } from '../types';

type HeatItem = { num: number; frequency: number; intensity: number };
type SumRange = { range: string; value: number; highlight?: boolean; count: number };
type OriginRange = { name: string; value: number; range: string; height: number };
type RankItem = { number: number; count: number };
type ParityBucket = { label: string; count: number; value: number; highlight?: boolean };

type ComboItem = { combo: number[]; count: number };
type StateItem = { state: string; appearances: number; winnersShare: number };

type RecordItem = { draw: Draw | null; value: number };

type SelectedPairItem = { combo: number[]; count: number };

export type SelectedNumberInsights = {
  selectedNumbers: number[];
  matchingAllCount: number;
  matchingAnyCount: number;
  topCompanions: RankItem[];
  topPairsWithSelected: SelectedPairItem[];
  recentMatchingContests: number[];
};

export type MegaStats = {
  totalDraws: number;
  latestDraw: Draw | null;
  heatmap: HeatItem[];
  mostFrequent: { number: number; count: number };
  mostAbsent: { number: number; draws: number };
  topFrequent: RankItem[];
  topAbsent: RankItem[];
  parityPattern: { evens: number; odds: number };
  parityDistribution: ParityBucket[];
  sumDistribution: SumRange[];
  originDistribution: OriginRange[];
  averageSum: number;
  averageRepeatsFromPrevious: number;
  consecutivePairRate: number;
  topPairs: ComboItem[];
  topTriples: ComboItem[];
  topConsecutivePairs: ComboItem[];
  topStates: StateItem[];
  highestPrize6: RecordItem;
  highestEstimatedPrize: RecordItem;
  highestRevenue: RecordItem;
  highestAccumulated: RecordItem;
  yearRange: { min: number | null; max: number | null };
};

export type StatsFilter = {
  windowSize: number | null;
  yearFrom: number | null;
  yearTo: number | null;
};

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function parseDrawYear(draw: Draw): number | null {
  const m = draw.date.match(/^(\d{4})-/);
  if (!m) return null;
  const y = Number(m[1]);
  return Number.isFinite(y) ? y : null;
}

function getCombinations(values: number[], size: number): number[][] {
  const result: number[][] = [];
  const arr = [...values].sort((a, b) => a - b);

  function helper(start: number, current: number[]) {
    if (current.length === size) {
      result.push([...current]);
      return;
    }

    for (let i = start; i < arr.length; i += 1) {
      current.push(arr[i]);
      helper(i + 1, current);
      current.pop();
    }
  }

  helper(0, []);
  return result;
}

function sortComboItems(items: ComboItem[]): ComboItem[] {
  return items.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.combo.join('-').localeCompare(b.combo.join('-'));
  });
}

function buildTopCombinations(draws: Draw[], size: number, limit = 10): ComboItem[] {
  const map = new Map<string, number>();

  for (const draw of draws) {
    const combos = getCombinations(draw.numbers, size);
    for (const combo of combos) {
      const key = combo.join('-');
      map.set(key, (map.get(key) || 0) + 1);
    }
  }

  return sortComboItems(
    [...map.entries()].map(([key, count]) => ({
      combo: key.split('-').map(Number),
      count,
    })),
  ).slice(0, limit);
}

function extractStates(cityUf: string): string[] {
  const text = (cityUf || '').toUpperCase();
  const matches = text.match(/\b[A-Z]{2}\b/g) || [];
  return [...new Set(matches)];
}

function buildStateRanking(draws: Draw[], limit = 10): StateItem[] {
  const appearance = new Map<string, number>();
  const winnersShare = new Map<string, number>();

  for (const draw of draws) {
    const states = extractStates(draw.cityUf);
    if (!states.length) continue;

    for (const state of states) {
      appearance.set(state, (appearance.get(state) || 0) + 1);
    }

    const share = draw.winners6 > 0 ? draw.winners6 / states.length : 0;
    for (const state of states) {
      winnersShare.set(state, (winnersShare.get(state) || 0) + share);
    }
  }

  return [...appearance.entries()]
    .map(([state, appearances]) => ({
      state,
      appearances,
      winnersShare: winnersShare.get(state) || 0,
    }))
    .sort((a, b) => {
      if (b.appearances !== a.appearances) return b.appearances - a.appearances;
      return b.winnersShare - a.winnersShare;
    })
    .slice(0, limit);
}

function numberToBadge(value: number) {
  return String(value).padStart(2, '0');
}

function bestBy(draws: Draw[], picker: (draw: Draw) => number): RecordItem {
  if (!draws.length) return { draw: null, value: 0 };
  let best = draws[0];
  let bestValue = picker(best);

  for (let i = 1; i < draws.length; i += 1) {
    const value = picker(draws[i]);
    if (value > bestValue) {
      best = draws[i];
      bestValue = value;
    }
  }

  return { draw: best, value: bestValue };
}

export function applyStatsFilter(draws: Draw[], filter: StatsFilter): Draw[] {
  const ordered = [...draws].sort((a, b) => a.concurso - b.concurso);
  const byYear = ordered.filter((draw) => {
    const year = parseDrawYear(draw);
    if (filter.yearFrom && (!year || year < filter.yearFrom)) return false;
    if (filter.yearTo && (!year || year > filter.yearTo)) return false;
    return true;
  });

  if (!filter.windowSize) return byYear;
  return byYear.slice(-filter.windowSize);
}

export function buildMegaStats(draws: Draw[]): MegaStats {
  const ordered = [...draws].sort((a, b) => a.concurso - b.concurso);
  const latestDraw = ordered.length ? ordered[ordered.length - 1] : null;
  const totalDraws = ordered.length;

  const years = ordered
    .map(parseDrawYear)
    .filter((value): value is number => value !== null);

  const frequency = Array.from({ length: 61 }, () => 0);

  for (const draw of ordered) {
    for (const num of draw.numbers) {
      if (num >= 1 && num <= 60) frequency[num] += 1;
    }
  }

  const maxFrequency = Math.max(1, ...frequency.slice(1));
  const heatmap: HeatItem[] = Array.from({ length: 60 }, (_, index) => {
    const num = index + 1;
    const count = frequency[num];
    return {
      num,
      frequency: count,
      intensity: count / maxFrequency,
    };
  });

  const topFrequent = [...heatmap]
    .sort((a, b) => b.frequency - a.frequency || a.num - b.num)
    .slice(0, 10)
    .map((item) => ({ number: item.num, count: item.frequency }));

  const lastSeen = Array.from({ length: 61 }, () => -1);
  ordered.forEach((draw, index) => {
    draw.numbers.forEach((num) => {
      lastSeen[num] = index;
    });
  });

  const absence = Array.from({ length: 60 }, (_, index) => {
    const num = index + 1;
    const gap = lastSeen[num] < 0 ? ordered.length : ordered.length - 1 - lastSeen[num];
    return { number: num, count: gap };
  });

  const topAbsent = [...absence]
    .sort((a, b) => b.count - a.count || a.number - b.number)
    .slice(0, 10);

  const mostFrequent = topFrequent[0] || { number: 1, count: 0 };
  const mostAbsent = topAbsent[0] || { number: 1, count: 0 };

  const parityMap = new Map<string, number>();
  const parityBuckets = Array.from({ length: 7 }, (_, evens) => ({ evens, count: 0 }));
  for (const draw of ordered) {
    const evens = draw.numbers.filter((n) => n % 2 === 0).length;
    const odds = 6 - evens;
    const key = `${evens}-${odds}`;
    parityMap.set(key, (parityMap.get(key) || 0) + 1);
    parityBuckets[evens].count += 1;
  }
  const topParity = [...parityMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '3-3';
  const [evens, odds] = topParity.split('-').map(Number);

  const parityDistribution: ParityBucket[] = parityBuckets.map((bucket) => ({
    label: `${bucket.evens}P-${6 - bucket.evens}I`,
    count: bucket.count,
    value: clampPercent((bucket.count / Math.max(1, totalDraws)) * 100),
  }));
  const parityHighlightIdx = parityDistribution.reduce(
    (bestIdx, item, idx, arr) => (item.value > arr[bestIdx].value ? idx : bestIdx),
    0,
  );
  if (parityDistribution.length) parityDistribution[parityHighlightIdx].highlight = true;

  const sumBuckets = [
    { label: '60-100', min: 60, max: 100, count: 0 },
    { label: '101-150', min: 101, max: 150, count: 0 },
    { label: '151-230', min: 151, max: 230, count: 0 },
    { label: '231-280', min: 231, max: 280, count: 0 },
    { label: '281-350', min: 281, max: 350, count: 0 },
  ];

  let sumAccumulator = 0;
  for (const draw of ordered) {
    const sum = draw.numbers.reduce((acc, n) => acc + n, 0);
    sumAccumulator += sum;
    const bucket = sumBuckets.find((item) => sum >= item.min && sum <= item.max);
    if (bucket) bucket.count += 1;
  }

  const sumDistribution: SumRange[] = sumBuckets.map((item) => ({
    range: item.label,
    count: item.count,
    value: clampPercent((item.count / Math.max(1, totalDraws)) * 100),
  }));
  const sumHighlightIndex = sumDistribution.reduce(
    (bestIdx, item, idx, arr) => (item.value > arr[bestIdx].value ? idx : bestIdx),
    0,
  );
  if (sumDistribution.length) sumDistribution[sumHighlightIndex].highlight = true;

  let low = 0;
  let mid = 0;
  let high = 0;
  for (const draw of ordered) {
    for (const num of draw.numbers) {
      if (num <= 20) low += 1;
      else if (num <= 40) mid += 1;
      else high += 1;
    }
  }
  const totalNumbers = Math.max(1, totalDraws * 6);
  const lowPct = clampPercent((low / totalNumbers) * 100);
  const midPct = clampPercent((mid / totalNumbers) * 100);
  const highPct = clampPercent((high / totalNumbers) * 100);
  const originDistribution: OriginRange[] = [
    { name: 'Baixos', value: lowPct, range: '(1-20)', height: lowPct },
    { name: 'Medios', value: midPct, range: '(21-40)', height: midPct },
    { name: 'Altos', value: highPct, range: '(41-60)', height: highPct },
  ];

  let repeatAccumulator = 0;
  let repeatSamples = 0;
  let drawsWithConsecutivePair = 0;

  const consecutivePairMap = new Map<string, number>();

  for (let i = 0; i < ordered.length; i += 1) {
    const current = ordered[i].numbers.slice().sort((a, b) => a - b);

    let hasConsecutive = false;
    for (let j = 1; j < current.length; j += 1) {
      if (current[j] - current[j - 1] === 1) {
        hasConsecutive = true;
        const key = `${current[j - 1]}-${current[j]}`;
        consecutivePairMap.set(key, (consecutivePairMap.get(key) || 0) + 1);
      }
    }
    if (hasConsecutive) drawsWithConsecutivePair += 1;

    if (i > 0) {
      const previous = new Set(ordered[i - 1].numbers);
      const repeats = current.filter((n) => previous.has(n)).length;
      repeatAccumulator += repeats;
      repeatSamples += 1;
    }
  }

  const topConsecutivePairs = sortComboItems(
    [...consecutivePairMap.entries()].map(([key, count]) => ({
      combo: key.split('-').map(Number),
      count,
    })),
  ).slice(0, 10);

  const averageRepeatsFromPrevious = repeatSamples ? repeatAccumulator / repeatSamples : 0;
  const consecutivePairRate = clampPercent((drawsWithConsecutivePair / Math.max(1, totalDraws)) * 100);

  const topPairs = buildTopCombinations(ordered, 2, 12);
  const topTriples = buildTopCombinations(ordered, 3, 12);
  const topStates = buildStateRanking(ordered, 12);

  return {
    totalDraws,
    latestDraw,
    heatmap,
    mostFrequent,
    mostAbsent: { number: mostAbsent.number, draws: mostAbsent.count },
    topFrequent,
    topAbsent,
    parityPattern: { evens: Number.isFinite(evens) ? evens : 3, odds: Number.isFinite(odds) ? odds : 3 },
    parityDistribution,
    sumDistribution,
    originDistribution,
    averageSum: totalDraws ? sumAccumulator / totalDraws : 0,
    averageRepeatsFromPrevious,
    consecutivePairRate,
    topPairs,
    topTriples,
    topConsecutivePairs,
    topStates,
    highestPrize6: bestBy(ordered, (draw) => draw.prize6 || 0),
    highestEstimatedPrize: bestBy(ordered, (draw) => draw.estimatedPrize || 0),
    highestRevenue: bestBy(ordered, (draw) => draw.totalRevenue || 0),
    highestAccumulated: bestBy(ordered, (draw) => draw.accumulated6 || 0),
    yearRange: {
      min: years.length ? Math.min(...years) : null,
      max: years.length ? Math.max(...years) : null,
    },
  };
}

export function analyzeSelectedNumbers(draws: Draw[], selectedNumbers: number[]): SelectedNumberInsights {
  const selectedSet = new Set(selectedNumbers);
  const normalized = [...selectedSet].filter((n) => n >= 1 && n <= 60).sort((a, b) => a - b);

  if (!normalized.length) {
    return {
      selectedNumbers: [],
      matchingAllCount: 0,
      matchingAnyCount: 0,
      topCompanions: [],
      topPairsWithSelected: [],
      recentMatchingContests: [],
    };
  }

  const matchingAll = draws.filter((draw) => normalized.every((n) => draw.numbers.includes(n)));
  const matchingAny = draws.filter((draw) => normalized.some((n) => draw.numbers.includes(n)));

  const companionFreq = Array.from({ length: 61 }, () => 0);
  for (const draw of matchingAll) {
    for (const num of draw.numbers) {
      if (!selectedSet.has(num)) companionFreq[num] += 1;
    }
  }

  const topCompanions = Array.from({ length: 60 }, (_, idx) => ({ number: idx + 1, count: companionFreq[idx + 1] }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.number - b.number)
    .slice(0, 10);

  const pairMap = new Map<string, number>();
  for (const draw of matchingAny) {
    const pairs = getCombinations(draw.numbers, 2);
    for (const pair of pairs) {
      if (!pair.some((n) => selectedSet.has(n))) continue;
      const key = pair.join('-');
      pairMap.set(key, (pairMap.get(key) || 0) + 1);
    }
  }

  const topPairsWithSelected = sortComboItems(
    [...pairMap.entries()].map(([key, count]) => ({ combo: key.split('-').map(Number), count })),
  ).slice(0, 10);

  return {
    selectedNumbers: normalized,
    matchingAllCount: matchingAll.length,
    matchingAnyCount: matchingAny.length,
    topCompanions,
    topPairsWithSelected,
    recentMatchingContests: matchingAll.slice(-10).reverse().map((draw) => draw.concurso),
  };
}

export function findDrawByConcurso(draws: Draw[], concurso: number): Draw | null {
  return draws.find((draw) => draw.concurso === concurso) || null;
}

export function formatNumberBadge(value: number) {
  return numberToBadge(value);
}
