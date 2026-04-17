import { useEffect, useMemo, useState } from 'react';
import {
  History,
  Play,
  Settings,
  ChevronRight,
  Target,
  RefreshCcw,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { fetchAllDraws } from '../lib/draws';
import { fetchBets, type BetRecord } from '../lib/bets';
import { buildMegaStats, formatNumberBadge } from '../lib/stats';
import type { Draw } from '../types';

type PeriodOption = '50' | '100' | '500' | 'all';

type SimulationResult = {
  totalDraws: number;
  totalInvested: number;
  totalPrizes: number;
  balance: number;
  quadras: number;
  quinas: number;
  senas: number;
  timeline: Array<{ concurso: number; hit: number }>;
  recentHits: Array<{ draw: Draw; hit: number; prize: number }>;
};

type OddsBreakdown = {
  sena: number;
  quina: number;
  quadra: number;
  atLeastQuadra: number;
};

type ScoreBreakdownItem = {
  label: string;
  description: string;
  points: number;
  maxPoints: number;
  matched: boolean;
};

type BetStatScore = {
  total: number;
  maxTotal: number;
  breakdown: ScoreBreakdownItem[];
};

const BET_COST = 5;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date);
}

function evaluateDraw(draw: Draw, numbers: number[]) {
  const hit = numbers.filter((n) => draw.numbers.includes(n)).length;
  let prize = 0;
  if (hit === 4) prize = draw.prize4 || 0;
  if (hit === 5) prize = draw.prize5 || 0;
  if (hit === 6) prize = draw.prize6 || 0;
  return { hit, prize };
}

function combination(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;

  const kk = Math.min(k, n - k);
  let result = 1;

  for (let i = 1; i <= kk; i += 1) {
    result = (result * (n - kk + i)) / i;
  }

  return result;
}

function calculateMegaOdds(): OddsBreakdown {
  const total = combination(60, 6);
  const sena = (combination(6, 6) * combination(54, 0)) / total;
  const quina = (combination(6, 5) * combination(54, 1)) / total;
  const quadra = (combination(6, 4) * combination(54, 2)) / total;

  return {
    sena,
    quina,
    quadra,
    atLeastQuadra: sena + quina + quadra,
  };
}

function chanceAtLeastOne(probability: number, trials: number): number {
  if (!trials || probability <= 0) return 0;
  return 1 - Math.pow(1 - probability, trials);
}

function formatProbability(probability: number): string {
  const pct = probability * 100;
  if (pct >= 1) return `${pct.toFixed(2)}%`;
  if (pct >= 0.01) return `${pct.toFixed(4)}%`;
  return `${pct.toFixed(6)}%`;
}

function formatOneIn(probability: number): string {
  if (!probability) return '-';
  const oneIn = Math.round(1 / probability);
  return `1 em ${oneIn.toLocaleString('pt-BR')}`;
}

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

function evaluateBetStatScore(numbers: number[], draws: Draw[]): BetStatScore {
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
      description: `Seu jogo: ${evens}P-${odds}I | Padrão mais recorrente: ${stats.parityPattern.evens}P-${stats.parityPattern.odds}I`,
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
      label: 'Sequências recorrentes',
      description: `${matchedSeqPairs} par(es) consecutivos do jogo aparecem nas sequências mais recorrentes`,
      points: Math.min(10, matchedSeqPairs * 5),
      maxPoints: 10,
      matched: matchedSeqPairs > 0,
    },
    {
      label: 'Força das dezenas',
      description: `Média de frequência das dezenas do jogo: ${(avgHeatRatio * 100).toFixed(1)}% da máxima`,
      points: Math.round(avgHeatRatio * 10),
      maxPoints: 10,
      matched: avgHeatRatio >= 0.5,
    },
  ];

  const total = breakdown.reduce((acc, item) => acc + item.points, 0);
  return { total, maxTotal, breakdown };
}

function simulate(draws: Draw[], bet: BetRecord | null): SimulationResult {
  if (!bet || !draws.length) {
    return {
      totalDraws: draws.length,
      totalInvested: 0,
      totalPrizes: 0,
      balance: 0,
      quadras: 0,
      quinas: 0,
      senas: 0,
      timeline: [],
      recentHits: [],
    };
  }

  let totalPrizes = 0;
  let quadras = 0;
  let quinas = 0;
  let senas = 0;
  const timeline: Array<{ concurso: number; hit: number }> = [];
  const recentHits: Array<{ draw: Draw; hit: number; prize: number }> = [];

  for (const draw of draws) {
    const { hit, prize } = evaluateDraw(draw, bet.numbers);
    timeline.push({ concurso: draw.concurso, hit });

    if (hit >= 4) {
      totalPrizes += prize;
      recentHits.push({ draw, hit, prize });
    }

    if (hit === 4) quadras += 1;
    if (hit === 5) quinas += 1;
    if (hit === 6) senas += 1;
  }

  const totalInvested = draws.length * BET_COST;

  return {
    totalDraws: draws.length,
    totalInvested,
    totalPrizes,
    balance: totalPrizes - totalInvested,
    quadras,
    quinas,
    senas,
    timeline,
    recentHits: recentHits.slice(-10).reverse(),
  };
}

export default function SimulatorPage() {
  const [bets, setBets] = useState<BetRecord[]>([]);
  const [allDraws, setAllDraws] = useState<Draw[]>([]);
  const [selectedBetId, setSelectedBetId] = useState<string>('');
  const [period, setPeriod] = useState<PeriodOption>('100');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [betsPerContest, setBetsPerContest] = useState<string>('1');
  const [plannedContests, setPlannedContests] = useState<string>('12');

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [nextBets, nextDraws] = await Promise.all([fetchBets(), fetchAllDraws()]);
      setBets(nextBets);
      setAllDraws(nextDraws);

      if (!selectedBetId && nextBets.length) {
        setSelectedBetId(nextBets[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar dados do simulador.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredDraws = useMemo(() => {
    if (!allDraws.length) return [];

    if (period === 'all') return allDraws;
    const count = Number(period);
    return allDraws.slice(-count);
  }, [allDraws, period]);

  const selectedBet = useMemo(() => bets.find((item) => item.id === selectedBetId) || null, [bets, selectedBetId]);
  const result = useMemo(() => simulate(filteredDraws, selectedBet), [filteredDraws, selectedBet]);
  const betStatScore = useMemo(
    () => evaluateBetStatScore(selectedBet?.numbers || [], filteredDraws),
    [selectedBet, filteredDraws],
  );
  const odds = useMemo(() => calculateMegaOdds(), []);

  const betsPerContestNumber = Math.max(0, Math.trunc(Number(betsPerContest) || 0));
  const plannedContestsNumber = Math.max(0, Math.trunc(Number(plannedContests) || 0));
  const totalPlannedBets = betsPerContestNumber * plannedContestsNumber;

  const historicalPrizeAverages = useMemo(() => {
    const total = filteredDraws.length || 1;
    const avgPrize4 = filteredDraws.reduce((acc, draw) => acc + (draw.prize4 || 0), 0) / total;
    const avgPrize5 = filteredDraws.reduce((acc, draw) => acc + (draw.prize5 || 0), 0) / total;
    const avgPrize6 = filteredDraws.reduce((acc, draw) => acc + (draw.prize6 || 0), 0) / total;
    return { avgPrize4, avgPrize5, avgPrize6 };
  }, [filteredDraws]);

  const expectedValuePerBet = useMemo(() => {
    const gross =
      odds.quadra * historicalPrizeAverages.avgPrize4 +
      odds.quina * historicalPrizeAverages.avgPrize5 +
      odds.sena * historicalPrizeAverages.avgPrize6;

    return {
      gross,
      net: gross - BET_COST,
    };
  }, [odds, historicalPrizeAverages]);

  const plannedChances = useMemo(
    () => ({
      quadra: chanceAtLeastOne(odds.quadra, totalPlannedBets),
      quina: chanceAtLeastOne(odds.quina, totalPlannedBets),
      sena: chanceAtLeastOne(odds.sena, totalPlannedBets),
      atLeastQuadra: chanceAtLeastOne(odds.atLeastQuadra, totalPlannedBets),
    }),
    [odds, totalPlannedBets],
  );

  return (
    <div className="space-y-8">
      <section className="bg-surface-container border border-outline rounded-3xl p-5 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                <Settings className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold">Configuracao da Simulacao</h2>
            </div>
            <p className="text-sm text-on-surface-variant font-medium leading-relaxed max-w-lg">
              Backtest real no historico importado com seu jogo cadastrado.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 w-full md:w-auto">
            <div className="flex-1 md:flex-none min-w-56">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant mb-2 block px-1">Jogo</label>
              <select
                value={selectedBetId}
                onChange={(e) => setSelectedBetId(e.target.value)}
                className="w-full bg-surface-dim border border-outline/50 rounded-xl px-4 py-3 text-sm font-bold outline-none"
              >
                {!bets.length ? <option value="">Nenhum jogo cadastrado</option> : null}
                {bets.map((bet) => (
                  <option key={bet.id} value={bet.id}>
                    {bet.numbers.map((n) => String(n).padStart(2, '0')).join(' - ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 md:flex-none min-w-44">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant mb-2 block px-1">Periodo</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as PeriodOption)}
                className="w-full bg-surface-dim border border-outline/50 rounded-xl px-4 py-3 text-sm font-bold outline-none"
              >
                <option value="50">Ultimos 50 concursos</option>
                <option value="100">Ultimos 100 concursos</option>
                <option value="500">Ultimos 500 concursos</option>
                <option value="all">Todo o historico</option>
              </select>
            </div>

            <button
              onClick={loadData}
              disabled={loading}
              className="w-full md:w-auto mt-auto green-gradient-btn px-8 py-3.5 rounded-xl text-white font-bold uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <RefreshCcw className="w-4 h-4" />
              {loading ? 'Carregando' : 'Recalcular'}
            </button>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm font-medium text-error">{error}</p> : null}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ResultHUDCard label="Total Investido" value={formatCurrency(result.totalInvested)} unit={`${result.totalDraws} apostas`} />
        <ResultHUDCard label="Premios Ganhos" value={formatCurrency(result.totalPrizes)} unit={`${result.quadras}Q · ${result.quinas}QN · ${result.senas}S`} />
        <ResultHUDCard label="Resultado Liquido" value={formatCurrency(result.balance)} unit="Saldo" negative={result.balance < 0} />
      </section>

      <section className="bg-surface-container border border-outline rounded-3xl p-5 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-xl">Realidade de Chances da Aposta</h3>
        </div>
        <p className="text-sm text-on-surface-variant font-medium">
          Probabilidades matematicas para aposta simples de 6 dezenas na Mega-Sena, com visao acumulada pelo volume de apostas.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <ProbabilityCard label="Sena (6 acertos)" oneIn={formatOneIn(odds.sena)} probability={formatProbability(odds.sena)} />
          <ProbabilityCard label="Quina (5 acertos)" oneIn={formatOneIn(odds.quina)} probability={formatProbability(odds.quina)} />
          <ProbabilityCard label="Quadra (4 acertos)" oneIn={formatOneIn(odds.quadra)} probability={formatProbability(odds.quadra)} />
          <ProbabilityCard
            label="Pelo menos quadra"
            oneIn={formatOneIn(odds.atLeastQuadra)}
            probability={formatProbability(odds.atLeastQuadra)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant mb-2 block">Apostas por concurso</label>
            <input
              type="number"
              min={0}
              step={1}
              value={betsPerContest}
              onChange={(e) => setBetsPerContest(e.target.value)}
              className="w-full bg-surface-dim border border-outline/50 rounded-xl px-4 py-3 text-sm font-bold outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant mb-2 block">Quantidade de concursos</label>
            <input
              type="number"
              min={0}
              step={1}
              value={plannedContests}
              onChange={(e) => setPlannedContests(e.target.value)}
              className="w-full bg-surface-dim border border-outline/50 rounded-xl px-4 py-3 text-sm font-bold outline-none"
            />
          </div>
          <div className="bg-surface-dim border border-outline/50 rounded-xl px-4 py-3 flex flex-col justify-center">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant">Total de apostas planejadas</span>
            <span className="text-xl font-bold text-on-surface mt-1">{totalPlannedBets.toLocaleString('pt-BR')}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <ProbabilityCard label="Chance de ao menos 1 sena" oneIn={formatOneIn(plannedChances.sena)} probability={formatProbability(plannedChances.sena)} />
          <ProbabilityCard label="Chance de ao menos 1 quina" oneIn={formatOneIn(plannedChances.quina)} probability={formatProbability(plannedChances.quina)} />
          <ProbabilityCard label="Chance de ao menos 1 quadra" oneIn={formatOneIn(plannedChances.quadra)} probability={formatProbability(plannedChances.quadra)} />
          <ProbabilityCard
            label="Chance de ao menos 1 premio (4+)"
            oneIn={formatOneIn(plannedChances.atLeastQuadra)}
            probability={formatProbability(plannedChances.atLeastQuadra)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ResultHUDCard label="Retorno esperado por aposta" value={formatCurrency(expectedValuePerBet.gross)} unit="Media historica por faixa" />
          <ResultHUDCard
            label="Valor esperado liquido"
            value={formatCurrency(expectedValuePerBet.net)}
            unit={`Apos custo de ${formatCurrency(BET_COST)}`}
            negative={expectedValuePerBet.net < 0}
          />
        </div>
      </section>

      <section className="bg-surface-container border border-outline rounded-3xl p-5 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-xl">Peso Estatístico do Jogo</h3>
        </div>
        <p className="text-sm text-on-surface-variant font-medium">
          Nota baseada no histórico filtrado: combina paridade, soma, pares/trincas e sequências recorrentes.
        </p>

        {selectedBet ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-outline p-5 rounded-2xl shadow-sm">
                <p className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest mb-1">Score Técnico</p>
                <p className="text-3xl font-bold text-on-surface">
                  {betStatScore.total}
                  <span className="text-base text-on-surface-variant">/{betStatScore.maxTotal}</span>
                </p>
              </div>
              <div className="bg-white border border-outline p-5 rounded-2xl shadow-sm md:col-span-2">
                <p className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest mb-2">Dezenas analisadas</p>
                <div className="flex flex-wrap gap-2">
                  {selectedBet.numbers.map((num) => (
                    <span key={num} className="px-3 py-1 rounded-full bg-primary-container text-primary font-bold text-sm">
                      {formatNumberBadge(num)}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {betStatScore.breakdown.map((item) => (
                <div key={item.label} className="rounded-2xl border border-outline/40 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-on-surface">{item.label}</p>
                    <span
                      className={cn(
                        'text-xs font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full',
                        item.matched ? 'bg-primary-container text-primary' : 'bg-surface-dim text-on-surface-variant',
                      )}
                    >
                      {item.points}/{item.maxPoints}
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant mt-1">{item.description}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-on-surface-variant text-sm">Selecione um jogo para calcular o peso estatístico.</p>
        )}
      </section>

      <section className="bg-surface-container border border-outline rounded-3xl overflow-hidden shadow-sm">
        <div className="px-4 md:px-8 py-4 md:py-6 border-b border-outline/50 flex flex-wrap justify-between items-center gap-3 bg-surface-dim/30">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-primary" />
            <h3 className="font-bold">Timeline de Acertos</h3>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            <span>{result.totalDraws} concursos</span>
          </div>
        </div>

        <div className="p-4 md:p-8">
          <div className="grid grid-cols-10 gap-1 sm:gap-2 mb-8 md:mb-10 overflow-hidden rounded-xl">
            {result.timeline.slice(-100).map((item) => (
              <div
                key={item.concurso}
                title={`Concurso ${item.concurso}: ${item.hit} acertos`}
                className={cn(
                  'aspect-square rounded border border-transparent',
                  item.hit >= 6 ? 'bg-emerald-700' :
                  item.hit === 5 ? 'bg-emerald-500' :
                  item.hit === 4 ? 'bg-primary' :
                  'bg-surface-dim border-outline/50',
                )}
              />
            ))}
          </div>

          <div className="space-y-2">
            <h4 className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest mb-4 px-1">Ultimos Acertos Relevantes</h4>
            {result.recentHits.length ? (
              result.recentHits.map((item) => (
                <div key={item.draw.concurso}>
                  <SimulationHistoryRow
                    date={formatDate(item.draw.date)}
                    concurso={String(item.draw.concurso)}
                    points={item.hit}
                    prize={formatCurrency(item.prize)}
                  />
                </div>
              ))
            ) : (
              <div className="p-4 rounded-xl bg-surface-dim/40 border border-outline/20 text-sm text-on-surface-variant">
                Nenhum acerto de quadra ou superior no periodo selecionado.
              </div>
            )}
          </div>
        </div>

        <button className="w-full py-5 bg-surface-dim border-t border-outline/30 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant flex items-center justify-center gap-2">
          Simulador em tempo real
          <ChevronRight className="w-4 h-4" />
        </button>
      </section>

      <section className="bg-surface-container border border-outline rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <Play className="w-5 h-5 text-primary" />
          <h3 className="font-bold">Jogo Selecionado</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {(selectedBet?.numbers || []).map((n) => (
            <span key={n} className="px-3 py-1 rounded-full bg-primary-container text-primary font-bold text-sm">
              {String(n).padStart(2, '0')}
            </span>
          ))}
          {!selectedBet ? <span className="text-on-surface-variant text-sm">Cadastre um jogo na aba Games para simular.</span> : null}
        </div>
      </section>
    </div>
  );
}

function ResultHUDCard({ label, value, unit, negative }: { label: string; value: string; unit: string; negative?: boolean }) {
  return (
    <div className="bg-white border border-outline p-6 rounded-3xl shadow-sm">
      <p className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className={cn('text-3xl font-bold font-inter', negative ? 'text-error' : 'text-on-surface')}>{value}</p>
        <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">{unit}</p>
      </div>
    </div>
  );
}

function ProbabilityCard({ label, oneIn, probability }: { label: string; oneIn: string; probability: string }) {
  return (
    <div className="bg-white border border-outline p-5 rounded-2xl shadow-sm">
      <p className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest mb-2">{label}</p>
      <p className="text-xl font-bold text-on-surface">{oneIn}</p>
      <p className="text-sm font-semibold text-primary mt-1">{probability}</p>
    </div>
  );
}

function SimulationHistoryRow({ date, concurso, points, prize }: { date: string; concurso: string; points: number; prize: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-5 gap-2 bg-surface-dim/40 border border-outline/20 rounded-2xl">
      <div className="flex items-center gap-3 md:gap-6">
        <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-80">{date}</div>
        <div className="px-3 py-1 bg-white border border-outline/50 rounded-lg text-xs font-bold">Concurso {concurso}</div>
      </div>
      <div className="flex items-center gap-3 md:gap-8">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant">{points} pts</span>
        </div>
        <div className="text-sm font-bold text-primary">{prize}</div>
      </div>
    </div>
  );
}
