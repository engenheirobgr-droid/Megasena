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

  return (
    <div className="space-y-8">
      <section className="bg-surface-container border border-outline rounded-3xl p-8 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                <Settings className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold">Configuração da Simulação</h2>
            </div>
            <p className="text-sm text-on-surface-variant font-medium leading-relaxed max-w-lg">
              Backtest real no histórico importado com seu jogo cadastrado.
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
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant mb-2 block px-1">Período</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as PeriodOption)}
                className="w-full bg-surface-dim border border-outline/50 rounded-xl px-4 py-3 text-sm font-bold outline-none"
              >
                <option value="50">Últimos 50 concursos</option>
                <option value="100">Últimos 100 concursos</option>
                <option value="500">Últimos 500 concursos</option>
                <option value="all">Todo o histórico</option>
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
        <ResultHUDCard label="Prêmios Ganhos" value={formatCurrency(result.totalPrizes)} unit={`${result.quadras}Q · ${result.quinas}QN · ${result.senas}S`} />
        <ResultHUDCard label="Resultado Líquido" value={formatCurrency(result.balance)} unit="Saldo" negative={result.balance < 0} />
      </section>

      <section className="bg-surface-container border border-outline rounded-3xl overflow-hidden shadow-sm">
        <div className="px-8 py-6 border-b border-outline/50 flex justify-between items-center bg-surface-dim/30">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-primary" />
            <h3 className="font-bold">Timeline de Acertos</h3>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            <span>{result.totalDraws} concursos</span>
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-10 gap-2 mb-10 overflow-hidden rounded-xl">
            {result.timeline.slice(-100).map((item) => (
              <div
                key={item.concurso}
                title={`Concurso ${item.concurso}: ${item.hit} acertos`}
                className={cn(
                  'aspect-square rounded border border-transparent',
                  item.hit >= 6 ? 'bg-emerald-700' :
                  item.hit === 5 ? 'bg-emerald-500' :
                  item.hit === 4 ? 'bg-primary' :
                  'bg-surface-dim border-outline/50'
                )}
              />
            ))}
          </div>

          <div className="space-y-2">
            <h4 className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest mb-4 px-1">Últimos Acertos Relevantes</h4>
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
                Nenhum acerto de quadra ou superior no período selecionado.
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
          <Target className="w-5 h-5 text-primary" />
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

function SimulationHistoryRow({ date, concurso, points, prize }: { date: string; concurso: string; points: number; prize: string }) {
  return (
    <div className="flex items-center justify-between p-5 bg-surface-dim/40 border border-outline/20 rounded-2xl">
      <div className="flex items-center gap-6">
        <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-80">{date}</div>
        <div className="px-3 py-1 bg-white border border-outline/50 rounded-lg text-xs font-bold">Concurso {concurso}</div>
      </div>
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant">{points} pts</span>
        </div>
        <div className="text-sm font-bold text-primary">{prize}</div>
      </div>
    </div>
  );
}
