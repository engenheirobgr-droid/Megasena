import type { Draw } from '../types';

type HeatItem = { num: number; frequency: number; intensity: number };
type SumRange = { range: string; value: number; highlight?: boolean; count: number };
type OriginRange = { name: string; value: number; range: string; height: number };
type RankItem = { number: number; count: number };
type ParityBucket = { label: string; count: number; value: number; highlight?: boolean };

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
};

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function numberLabel(value: number) {
  return String(value).padStart(2, '0');
}

export function buildMegaStats(draws: Draw[]): MegaStats {
  const ordered = [...draws].sort((a, b) => a.concurso - b.concurso);
  const latestDraw = ordered.length ? ordered[ordered.length - 1] : null;
  const totalDraws = ordered.length;

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

  for (let i = 0; i < ordered.length; i += 1) {
    const current = ordered[i].numbers;

    const hasConsecutive = current
      .slice()
      .sort((a, b) => a - b)
      .some((value, idx, arr) => idx > 0 && value - arr[idx - 1] === 1);
    if (hasConsecutive) drawsWithConsecutivePair += 1;

    if (i > 0) {
      const previous = new Set(ordered[i - 1].numbers);
      const repeats = current.filter((n) => previous.has(n)).length;
      repeatAccumulator += repeats;
      repeatSamples += 1;
    }
  }

  const averageRepeatsFromPrevious = repeatSamples ? repeatAccumulator / repeatSamples : 0;
  const consecutivePairRate = clampPercent((drawsWithConsecutivePair / Math.max(1, totalDraws)) * 100);

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
  };
}

export function formatNumberBadge(value: number) {
  return numberLabel(value);
}
