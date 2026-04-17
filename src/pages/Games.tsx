import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Plus, RefreshCcw, Trash2, WandSparkles } from 'lucide-react';
import { createBet, fetchBets, removeBet, type BetRecord } from '../lib/bets';
import { fetchAllDraws } from '../lib/draws';
import { evaluateBetStatScore, generateBetByStatWeight } from '../lib/betScore';
import type { Draw } from '../types';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function randomBet() {
  const picked = new Set<number>();
  while (picked.size < 6) picked.add(Math.floor(Math.random() * 60) + 1);
  return [...picked].sort((a, b) => a - b);
}

function evaluateBet(numbers: number[], draws: Draw[]) {
  let bestHit = 0;
  let bestConcurso = 0;
  let quadras = 0;
  let quinas = 0;
  let senas = 0;

  for (const draw of draws) {
    const hits = numbers.filter((n) => draw.numbers.includes(n)).length;
    if (hits > bestHit) {
      bestHit = hits;
      bestConcurso = draw.concurso;
    }
    if (hits === 4) quadras += 1;
    if (hits === 5) quinas += 1;
    if (hits === 6) senas += 1;
  }

  return { bestHit, bestConcurso, quadras, quinas, senas };
}

export default function GamesPage() {
  const { firebaseReady, authError } = useAuth();
  const [bets, setBets] = useState<BetRecord[]>([]);
  const [draws, setDraws] = useState<Draw[]>([]);
  const [numbers, setNumbers] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextBets, nextDraws] = await Promise.all([fetchBets(), fetchAllDraws()]);
      setBets(nextBets);
      setDraws(nextDraws);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar jogos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totals = useMemo(() => {
    let quadras = 0;
    let quinas = 0;
    let senas = 0;

    for (const bet of bets) {
      const result = evaluateBet(bet.numbers, draws);
      quadras += result.quadras;
      quinas += result.quinas;
      senas += result.senas;
    }

    return { quadras, quinas, senas };
  }, [bets, draws]);

  const candidateScore = useMemo(() => evaluateBetStatScore(numbers, draws), [numbers, draws]);

  const handleNumberChange = (index: number, value: string) => {
    const parsed = Number(value);
    setNumbers((current) => {
      const next = [...current];
      next[index] = Number.isFinite(parsed) ? parsed : 0;
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await createBet(numbers, note);
      setSuccess('Jogo salvo com sucesso.');
      setNote('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel salvar o jogo.');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateWeighted = () => {
    if (!draws.length) {
      setError('Importe o historico antes de gerar jogo por peso estatistico.');
      return;
    }

    const generated = generateBetByStatWeight(draws, 5000);
    setNumbers(generated.numbers);
    setSuccess(`Jogo sugerido com score ${generated.score.total}/${generated.score.maxTotal}.`);
    setError(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await removeBet(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao remover jogo.');
    }
  };

  return (
    <div className="space-y-8">
      <section className="bg-surface-container border border-outline rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <h2 className="text-3xl font-extrabold text-on-surface">Meus Jogos</h2>
            <p className="text-sm text-on-surface-variant font-medium mt-2">
              Cadastro real com conferência automática no histórico importado.
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Base de concursos: {draws.length} | Jogos cadastrados: {bets.length}
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-widest bg-surface-dim text-on-surface-variant hover:bg-surface-container-highest border border-outline"
          >
            <RefreshCcw className="w-4 h-4" />
            Atualizar
          </button>
        </div>

        {!firebaseReady ? (
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Firebase indisponivel neste build: jogos salvos localmente no navegador.
          </p>
        ) : null}
        {authError ? <p className="mt-2 text-sm font-medium text-error">{authError}</p> : null}
        {success ? <p className="mt-2 text-sm font-medium text-primary">{success}</p> : null}
        {error ? <p className="mt-2 text-sm font-medium text-error">{error}</p> : null}
      </section>

      <section className="bg-surface-container border border-outline rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">Novo Jogo</h3>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setNumbers(randomBet())}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest bg-primary-container text-primary"
            >
              <WandSparkles className="w-4 h-4" />
              Gerar Aleatório
            </button>
            <button
              onClick={handleGenerateWeighted}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest green-gradient-btn text-white"
            >
              <WandSparkles className="w-4 h-4" />
              Gerar por Peso
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-outline/50 bg-surface-dim/50 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Score estatístico estimado</p>
          <p className="text-lg font-extrabold text-on-surface mt-1">
            {candidateScore.total}/{candidateScore.maxTotal}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {numbers.map((value, index) => (
            <label key={index} className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">D{index + 1}</span>
              <input
                type="number"
                min={1}
                max={60}
                value={value || ''}
                onChange={(e) => handleNumberChange(index, e.target.value)}
                className="rounded-xl border border-outline bg-white px-3 py-2 font-bold text-on-surface"
              />
            </label>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 md:items-end">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Observação</span>
            <input
              type="text"
              placeholder="Ex.: estratégia equilibrada"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="rounded-xl border border-outline bg-white px-3 py-2 font-medium text-on-surface"
            />
          </label>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest green-gradient-btn text-white disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Jogo'}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard label="Total de Quadras" value={totals.quadras} />
        <SummaryCard label="Total de Quinas" value={totals.quinas} />
        <SummaryCard label="Total de Senas" value={totals.senas} highlight />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {bets.map((bet) => {
          const result = evaluateBet(bet.numbers, draws);
          return (
            <article key={bet.id} className="bg-surface-container border border-outline rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Criado em</p>
                  <p className="text-sm font-bold text-on-surface">{formatDate(bet.createdAt)}</p>
                  {bet.note ? <p className="text-xs text-on-surface-variant mt-1">{bet.note}</p> : null}
                </div>
                <button
                  onClick={() => handleDelete(bet.id)}
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-widest bg-error-container text-error"
                >
                  <Trash2 className="w-4 h-4" />
                  Remover
                </button>
              </div>

              <div className="grid grid-cols-6 gap-2">
                {bet.numbers.map((num) => (
                  <div key={num} className="aspect-square rounded-lg bg-surface-dim border border-outline flex items-center justify-center font-bold text-on-surface">
                    {pad(num)}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Metric label="Melhor acerto" value={`${result.bestHit}`} />
                <Metric label="Concurso" value={result.bestConcurso ? String(result.bestConcurso) : '-'} />
                <Metric label="Quadras" value={String(result.quadras)} />
                <Metric label="Quinas/Senas" value={`${result.quinas}/${result.senas}`} />
              </div>
            </article>
          );
        })}

        {!bets.length ? (
          <div className="bg-surface-container border border-outline rounded-3xl p-8 shadow-sm text-center text-on-surface-variant">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-3" />
            Nenhum jogo cadastrado ainda. Crie o primeiro acima.
          </div>
        ) : null}
      </section>
    </div>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={cn(
        'bg-surface-container border border-outline rounded-2xl p-5 shadow-sm',
        highlight && 'ring-2 ring-primary/30',
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</p>
      <p className="text-2xl font-extrabold text-on-surface mt-2">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-outline/60 bg-white px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</p>
      <p className="text-sm font-bold text-on-surface mt-1">{value}</p>
    </div>
  );
}
