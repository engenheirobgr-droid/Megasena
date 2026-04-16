import type { Draw } from '../types';

type HeatItem = { num: number; frequency: number; intensity: number };
type SumRange = { range: string; value: number; highlight?: boolean };
type OriginRange = { name: string; value: number; range: string; height: number };

export type MegaStats = {
  latestDraw: Draw | null;
  heatmap: HeatItem[];
  mostFrequent: { number: number; count: number };
  mostAbsent: { number: number; draws: number };
  parityPattern: { evens: number; odds: number };
  sumDistribution: SumRange[];
  originDistribution: OriginRange[];
};

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function buildMegaStats(draws: Draw[]): MegaStats {
  const ordered = [...draws].sort((a, b) => a.concurso - b.concurso);
  const latestDraw = ordered.length ? ordered[ordered.length - 1] : null;
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

  let mostFrequentNumber = 1;
  for (let num = 2; num <= 60; num += 1) {
    if (frequency[num] > frequency[mostFrequentNumber]) mostFrequentNumber = num;
  }

  const lastSeen = Array.from({ length: 61 }, () => -1);
  ordered.forEach((draw, index) => {
    draw.numbers.forEach((num) => {
      lastSeen[num] = index;
    });
  });

  let mostAbsentNumber = 1;
  let mostAbsentDraws = ordered.length;
  for (let num = 1; num <= 60; num += 1) {
    const gap = lastSeen[num] < 0 ? ordered.length : ordered.length - 1 - lastSeen[num];
    if (gap > mostAbsentDraws) {
      mostAbsentDraws = gap;
      mostAbsentNumber = num;
    }
  }

  const parityMap = new Map<string, number>();
  for (const draw of ordered) {
    const evens = draw.numbers.filter((n) => n % 2 === 0).length;
    const odds = 6 - evens;
    const key = `${evens}-${odds}`;
    parityMap.set(key, (parityMap.get(key) || 0) + 1);
  }
  const topParity = [...parityMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '3-3';
  const [evens, odds] = topParity.split('-').map(Number);

  const sumBuckets = [
    { label: '60-100', min: 60, max: 100, count: 0 },
    { label: '100-150', min: 101, max: 150, count: 0 },
    { label: '150-230', min: 151, max: 230, count: 0 },
    { label: '230-280', min: 231, max: 280, count: 0 },
    { label: '280-350', min: 281, max: 350, count: 0 },
  ];
  for (const draw of ordered) {
    const sum = draw.numbers.reduce((acc, n) => acc + n, 0);
    const bucket = sumBuckets.find((item) => sum >= item.min && sum <= item.max);
    if (bucket) bucket.count += 1;
  }
  const totalDraws = Math.max(1, ordered.length);
  const sumDistribution: SumRange[] = sumBuckets.map((item) => ({
    range: item.label,
    value: clampPercent((item.count / totalDraws) * 100),
  }));
  const highlightIndex = sumDistribution.reduce(
    (bestIdx, item, idx, arr) => (item.value > arr[bestIdx].value ? idx : bestIdx),
    0,
  );
  if (sumDistribution.length) {
    sumDistribution[highlightIndex].highlight = true;
  }

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
  const totalNumbers = Math.max(1, ordered.length * 6);
  const lowPct = clampPercent((low / totalNumbers) * 100);
  const midPct = clampPercent((mid / totalNumbers) * 100);
  const highPct = clampPercent((high / totalNumbers) * 100);
  const originDistribution: OriginRange[] = [
    { name: 'Baixos', value: lowPct, range: '(1-20)', height: lowPct },
    { name: 'Medios', value: midPct, range: '(21-40)', height: midPct },
    { name: 'Altos', value: highPct, range: '(41-60)', height: highPct },
  ];

  return {
    latestDraw,
    heatmap,
    mostFrequent: { number: mostFrequentNumber, count: frequency[mostFrequentNumber] },
    mostAbsent: { number: mostAbsentNumber, draws: mostAbsentDraws },
    parityPattern: { evens: Number.isFinite(evens) ? evens : 3, odds: Number.isFinite(odds) ? odds : 3 },
    sumDistribution,
    originDistribution,
  };
}

