import { useEffect, useMemo, useState, type ComponentType } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertCircle,
  RefreshCcw,
  ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '../lib/utils';
import { fetchBets, type BetRecord } from '../lib/bets';
import { fetchAllDraws } from '../lib/draws';
import type { Draw } from '../types';

const BET_COST = 5;
const FINANCE_SELECTED_BETS_KEY = 'megasena.finance.selectedBetIds';

type DrawFinance = {
  draw: Draw;
  invested: number;
  prizes: number;
  net: number;
  balance: number;
  hits4: number;
  hits5: number;
  hits6: number;
};

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
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date);
}

function evaluateDraw(draw: Draw, bets: BetRecord[]) {
  let prizes = 0;
  let hits4 = 0;
  let hits5 = 0;
  let hits6 = 0;

  for (const bet of bets) {
    const hit = bet.numbers.filter((n) => draw.numbers.includes(n)).length;
    if (hit === 4) {
      hits4 += 1;
      prizes += draw.prize4 || 0;
    }
    if (hit === 5) {
      hits5 += 1;
      prizes += draw.prize5 || 0;
    }
    if (hit === 6) {
      hits6 += 1;
      prizes += draw.prize6 || 0;
    }
  }

  const invested = bets.length * BET_COST;
  return {
    invested,
    prizes,
    net: prizes - invested,
    hits4,
    hits5,
    hits6,
  };
}

function buildFinanceByDraw(draws: Draw[], bets: BetRecord[]) {
  let balance = 0;
  const items: DrawFinance[] = [];

  for (const draw of draws) {
    const result = evaluateDraw(draw, bets);
    balance += result.net;
    items.push({
      draw,
      ...result,
      balance,
    });
  }

  return items;
}

export default function FinancePage() {
  const [bets, setBets] = useState<BetRecord[]>([]);
  const [draws, setDraws] = useState<Draw[]>([]);
  const [selectedBetIds, setSelectedBetIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [nextBets, nextDraws] = await Promise.all([fetchBets(), fetchAllDraws()]);
        setBets(nextBets);
        setDraws(nextDraws);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar financeiro.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  useEffect(() => {
    if (!bets.length) {
      setSelectedBetIds([]);
      return;
    }

    let nextSelected: string[] = [];
    try {
      const raw = window.localStorage.getItem(FINANCE_SELECTED_BETS_KEY);
      if (raw) nextSelected = (JSON.parse(raw) as string[]) || [];
    } catch {
      nextSelected = [];
    }

    const validIds = new Set(bets.map((bet) => bet.id));
    const filtered = nextSelected.filter((id) => validIds.has(id));
    setSelectedBetIds(filtered.length ? filtered : bets.map((bet) => bet.id));
  }, [bets]);

  useEffect(() => {
    try {
      window.localStorage.setItem(FINANCE_SELECTED_BETS_KEY, JSON.stringify(selectedBetIds));
    } catch {
      // ignore localStorage persistence issues
    }
  }, [selectedBetIds]);

  const activeBets = useMemo(
    () => bets.filter((bet) => selectedBetIds.includes(bet.id)),
    [bets, selectedBetIds],
  );

  const financeByDraw = useMemo(() => buildFinanceByDraw(draws, activeBets), [draws, activeBets]);

  const summary = useMemo(() => {
    const totalInvested = financeByDraw.reduce((acc, item) => acc + item.invested, 0);
    const totalPrizes = financeByDraw.reduce((acc, item) => acc + item.prizes, 0);
    const balance = totalPrizes - totalInvested;
    const roi = totalInvested > 0 ? (balance / totalInvested) * 100 : 0;

    const last30 = financeByDraw.slice(-30);
    const invested30 = last30.reduce((acc, item) => acc + item.invested, 0);
    const prizes30 = last30.reduce((acc, item) => acc + item.prizes, 0);
    const balance30 = prizes30 - invested30;

    return {
      totalInvested,
      totalPrizes,
      balance,
      roi,
      invested30,
      prizes30,
      balance30,
    };
  }, [financeByDraw]);

  const chartData = useMemo(() => {
    return financeByDraw.slice(-60).map((item) => ({
      day: String(item.draw.concurso),
      balance: Number(item.balance.toFixed(2)),
    }));
  }, [financeByDraw]);

  const transactions = useMemo(() => {
    return [...financeByDraw]
      .reverse()
      .slice(0, 14)
      .map((item) => {
        const prizeText = item.prizes > 0
          ? `${item.hits4}Q ${item.hits5}QN ${item.hits6}S`
          : 'Sem premiação';

        return {
          id: item.draw.concurso,
          date: formatDate(item.draw.date),
          label: `Concurso ${item.draw.concurso}`,
          invested: item.invested,
          prizes: item.prizes,
          net: item.net,
          status: prizeText,
        };
      });
  }, [financeByDraw]);

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <FinanceCard
          label="Total Investido"
          value={formatCurrency(summary.totalInvested)}
          delta={`${activeBets.length} jogos ativos`}
          icon={TrendingDown}
        />
        <FinanceCard
          label="Total Prêmios"
          value={formatCurrency(summary.totalPrizes)}
          delta={`${draws.length} concursos analisados`}
          icon={TrendingUp}
          positive
        />
        <FinanceCard
          label="Saldo Líquido"
          value={formatCurrency(summary.balance)}
          delta={`${summary.roi.toFixed(2)}% ROI`}
          icon={Wallet}
          positive={summary.balance >= 0}
          highlight
        />

        <button
          onClick={() => window.location.reload()}
          className="bg-surface-container border border-outline rounded-3xl p-6 shadow-sm flex flex-col justify-between group hover:border-primary transition-all"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 bg-primary-container text-primary rounded-xl">
              <RefreshCcw className="w-6 h-6" />
            </div>
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-on-surface">Atualizar Dados</p>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Recalcular financeiro</p>
          </div>
        </button>
      </section>

      <section className="bg-surface-container border border-outline rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-on-surface">Jogos considerados no financeiro</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedBetIds(bets.map((bet) => bet.id))}
              className="rounded-xl border border-outline px-3 py-1.5 text-xs font-bold uppercase tracking-widest bg-white text-on-surface-variant"
            >
              Marcar todos
            </button>
            <button
              onClick={() => setSelectedBetIds([])}
              className="rounded-xl border border-outline px-3 py-1.5 text-xs font-bold uppercase tracking-widest bg-white text-on-surface-variant"
            >
              Limpar
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {bets.map((bet) => {
            const selected = selectedBetIds.includes(bet.id);
            return (
              <button
                key={bet.id}
                onClick={() =>
                  setSelectedBetIds((current) =>
                    current.includes(bet.id) ? current.filter((id) => id !== bet.id) : [...current, bet.id],
                  )
                }
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-all',
                  selected
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-on-surface-variant border-outline',
                )}
                title={bet.note || ''}
              >
                {bet.numbers.map((n) => String(n).padStart(2, '0')).join('-')}
              </button>
            );
          })}
          {!bets.length ? <p className="text-sm text-on-surface-variant">Nenhum jogo cadastrado.</p> : null}
        </div>
      </section>

      <section className="bg-surface-container border border-outline rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-on-surface">Como ler o financeiro</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-outline/50 bg-white px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Total Investido</p>
            <p className="text-sm text-on-surface mt-1">Quantidade de jogos ativos x R$ 5,00 por concurso analisado.</p>
          </div>
          <div className="rounded-xl border border-outline/50 bg-white px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Total Premios</p>
            <p className="text-sm text-on-surface mt-1">Soma dos premios (quadra, quina e sena) que seus jogos acertariam no historico.</p>
          </div>
          <div className="rounded-xl border border-outline/50 bg-white px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Saldo e ROI</p>
            <p className="text-sm text-on-surface mt-1">Saldo = premios - investimento. ROI = saldo dividido pelo total investido.</p>
          </div>
        </div>
        <p className="text-xs text-on-surface-variant font-medium">
          Legenda das movimentacoes: Q = quadra, QN = quina, S = sena.
        </p>
      </section>

      <section className="bg-primary/5 border border-primary/10 rounded-3xl p-6 flex items-center gap-6">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm border border-outline">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold text-on-surface">Resultado dos últimos 30 concursos: {formatCurrency(summary.balance30)}</div>
          <p className="text-xs text-on-surface-variant mt-1 font-medium">
            Investido: {formatCurrency(summary.invested30)} · Prêmios: {formatCurrency(summary.prizes30)}
          </p>
          {error ? <p className="text-xs text-error mt-1">{error}</p> : null}
          {!bets.length || !draws.length ? (
            <p className="text-xs text-on-surface-variant mt-1">Cadastre jogos e importe concursos para ter apuração completa.</p>
          ) : null}
          {loading ? <p className="text-xs text-on-surface-variant mt-1">Recalculando...</p> : null}
        </div>
      </section>

      <section className="bg-surface-container border border-outline rounded-3xl p-5 md:p-8 shadow-sm">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h3 className="text-xl font-bold">Evolução do Saldo</h3>
            <p className="text-sm text-on-surface-variant font-medium">Saldo acumulado por concurso (últimos 60)</p>
          </div>
          <div className="flex bg-surface-dim p-1.5 rounded-xl border border-outline/50 gap-2">
            <span className="px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              ROI: {summary.roi.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="h-80 w-full mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }}
                tickFormatter={(value) => `R$ ${Math.round(value)}`}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#3B82F6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorBalance)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="bg-surface-container border border-outline rounded-3xl overflow-hidden shadow-sm">
        <div className="px-4 md:px-8 py-4 md:py-6 border-b border-outline/50 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold">Últimas Movimentações por Concurso</h3>
        </div>
        <div className="divide-y divide-outline/30">
          {transactions.map((tx) => (
            <div key={tx.id}>
              <TransactionRow
                date={tx.date}
                label={tx.label}
                amount={`${tx.net >= 0 ? '+' : '-'} ${formatCurrency(Math.abs(tx.net))}`}
                status={tx.status}
                positive={tx.net >= 0}
                detail={`Investido ${formatCurrency(tx.invested)} · Prêmios ${formatCurrency(tx.prizes)}`}
              />
            </div>
          ))}
          {!transactions.length ? (
            <div className="px-8 py-6 text-sm text-on-surface-variant">
              Sem movimentações ainda. Importe concursos e cadastre jogos para gerar histórico.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function FinanceCard({
  label,
  value,
  delta,
  icon: Icon,
  positive,
  highlight,
}: {
  label: string;
  value: string;
  delta: string;
  icon: ComponentType<{ className?: string }>;
  positive?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'bg-surface-container border border-outline p-6 rounded-3xl shadow-sm transition-all hover:translate-y-[-4px]',
        highlight && 'ring-2 ring-primary/20',
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm',
            positive ? 'bg-primary-container text-primary' : 'bg-surface-dim text-on-surface-variant',
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        <span
          className={cn(
            'text-[9px] font-bold px-2 py-0.5 rounded-full border shadow-sm',
            positive
              ? 'bg-primary/5 text-primary border-primary/20'
              : 'bg-on-surface-variant/5 text-on-surface-variant border-outline',
          )}
        >
          {delta}
        </span>
      </div>
      <p className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-bold font-inter text-on-surface">{value}</p>
    </div>
  );
}

function TransactionRow({
  date,
  label,
  amount,
  status,
  positive,
  detail,
}: {
  date: string;
  label: string;
  amount: string;
  status: string;
  positive?: boolean;
  detail: string;
}) {
  return (
    <div className="px-4 md:px-8 py-4 md:py-5 flex items-center justify-between gap-3 hover:bg-surface-dim transition-all group">
      <div className="flex items-center gap-4">
        <div className="text-[10px] font-bold text-on-surface-variant/40 group-hover:text-primary transition-colors">{date}</div>
        <div>
          <div className="text-sm font-bold text-on-surface">{label}</div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">{status}</div>
          <div className="text-[10px] text-on-surface-variant mt-0.5">{detail}</div>
        </div>
      </div>
      <div className={cn('text-sm font-bold flex items-center gap-2', positive ? 'text-primary' : 'text-on-surface')}>
        {amount}
        <ArrowUpRight className={cn('w-4 h-4 opacity-0 group-hover:opacity-100 transition-all', !positive && 'rotate-90')} />
      </div>
    </div>
  );
}


