import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Flame, Snowflake, Award, UploadCloud, RefreshCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import { buildMegaStats } from '../lib/stats';
import { fetchAllDraws, importDrawsWorkbook } from '../lib/draws';
import { useAuth } from '../contexts/AuthContext';
import type { Draw } from '../types';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value: string) {
  if (!value) return 'Data indisponivel';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(date);
}

export default function StatsPage() {
  const { firebaseReady } = useAuth();
  const [draws, setDraws] = useState<Draw[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  const loadDraws = useCallback(async () => {
    if (!firebaseReady) {
      setLoading(false);
      setDraws([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllDraws();
      setDraws(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar concursos.');
    } finally {
      setLoading(false);
    }
  }, [firebaseReady]);

  useEffect(() => {
    loadDraws();
  }, [loadDraws]);

  const stats = useMemo(() => buildMegaStats(draws), [draws]);
  const latest = stats.latestDraw;

  const handleImport = async () => {
    if (!file) {
      setImportSummary('Selecione um arquivo XLSX antes de importar.');
      return;
    }
    setImporting(true);
    setImportSummary(null);
    setError(null);
    try {
      const summary = await importDrawsWorkbook(file);
      setImportSummary(
        `Importacao concluida: ${summary.processed} processados, ${summary.created} novos, ${summary.updated} atualizados, ${summary.skipped} ignorados.`,
      );
      await loadDraws();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao importar o arquivo.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="bg-surface-container border border-outline rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-6 lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-extrabold text-on-surface">Base Historica da Mega-Sena</h2>
            <p className="text-sm text-on-surface-variant font-medium">
              Importe seu arquivo XLSX oficial para alimentar estatisticas e simuladores reais.
            </p>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Concursos carregados: {draws.length}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center w-full lg:w-auto">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full sm:w-auto text-xs font-bold uppercase tracking-widest file:mr-4 file:rounded-xl file:border-0 file:bg-primary file:px-4 file:py-2 file:text-white file:cursor-pointer"
            />
            <button
              onClick={handleImport}
              disabled={!firebaseReady || importing}
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-widest transition-all',
                firebaseReady
                  ? 'green-gradient-btn text-white hover:opacity-90 disabled:opacity-60'
                  : 'bg-surface-dim text-on-surface-variant cursor-not-allowed',
              )}
            >
              <UploadCloud className="w-4 h-4" />
              {importing ? 'Importando...' : 'Importar XLSX'}
            </button>
            <button
              onClick={loadDraws}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-widest bg-surface-dim text-on-surface-variant hover:bg-surface-container-highest border border-outline"
            >
              <RefreshCcw className="w-4 h-4" />
              Atualizar
            </button>
          </div>
        </div>

        {importSummary ? (
          <p className="mt-4 text-sm font-medium text-primary">{importSummary}</p>
        ) : null}
        {error ? <p className="mt-4 text-sm font-medium text-error">{error}</p> : null}
      </section>

      <section className="green-gradient-btn rounded-3xl p-10 relative overflow-hidden shadow-2xl shadow-primary/20 transition-all hover:scale-[1.01]">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-40 -mt-40 blur-3xl" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <span className="font-bold text-white/70 uppercase tracking-[0.2em] text-[10px]">Ultimo Sorteio</span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mt-1">
              {latest ? `Concurso ${latest.concurso}` : 'Nenhum concurso importado'}
            </h2>
            <p className="text-white/90 text-sm mt-2">{latest ? formatDate(latest.date) : 'Importe o arquivo para iniciar.'}</p>
          </div>
          <div className="text-right">
            <div className="bg-white/20 text-white backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest inline-block mb-2">
              {latest?.winners6 ? 'Teve ganhador' : 'Acumulou'}
            </div>
            <p className="text-white font-bold text-lg leading-tight">
              Proximo premio estimado:<br />
              <span className="text-3xl md:text-4xl">{latest ? formatCurrency(latest.estimatedPrize) : 'R$ 0'}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 mt-12 relative z-10">
          {(latest?.numbers || [0, 0, 0, 0, 0, 0]).map((num, idx) => (
            <motion.div
              key={`${num}-${idx}`}
              whileHover={{ scale: 1.08, y: -4 }}
              className="w-16 h-16 md:w-24 md:h-24 bg-white/15 backdrop-blur-lg border border-white/20 rounded-2xl flex items-center justify-center shadow-xl"
            >
              <span className="font-extrabold text-3xl md:text-4xl text-white">{String(num).padStart(2, '0')}</span>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-surface-container border border-outline rounded-3xl p-8 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-bold text-xl">Volante de Calor</h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Frequencia historica
            </span>
          </div>

          <div className="grid grid-cols-10 gap-2 md:gap-3">
            {stats.heatmap.map((item) => (
              <div
                key={item.num}
                title={`Numero ${item.num} saiu ${item.frequency} vezes`}
                className={cn(
                  'aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all hover:ring-2 hover:ring-primary/40 cursor-help',
                  item.intensity > 0.8
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : item.intensity > 0.55
                      ? 'bg-primary-container text-primary'
                      : item.intensity > 0.3
                        ? 'bg-primary-container/40 text-on-surface-variant'
                        : 'bg-surface-dim text-on-surface-variant/40 border border-outline/30',
                )}
              >
                {String(item.num).padStart(2, '0')}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <InsightCard
            icon={Flame}
            title="Mais frequente"
            subtitle="Quem mais aparece"
            value={`Numero ${String(stats.mostFrequent.number).padStart(2, '0')} · ${stats.mostFrequent.count} vezes`}
            color="primary"
          />
          <InsightCard
            icon={Snowflake}
            title="Mais ausente"
            subtitle="Sumido ha mais tempo"
            value={`Numero ${String(stats.mostAbsent.number).padStart(2, '0')} · ${stats.mostAbsent.draws} concursos`}
            color="gray"
          />
          <InsightCard
            icon={Award}
            title="Par ou impar?"
            subtitle="Padrao mais recorrente"
            value={`${stats.parityPattern.evens} pares + ${stats.parityPattern.odds} impares`}
            color="light"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-surface-container border border-outline rounded-3xl p-8 shadow-sm">
          <h3 className="font-bold text-xl mb-1">Distribuicao da Soma</h3>
          <p className="text-sm text-on-surface-variant mb-10 font-medium">Frequencia por intervalo de soma dos numeros.</p>
          <div className="space-y-6">
            {stats.sumDistribution.map((item) => (
              <div key={item.range} className="flex items-center gap-4">
                <span
                  className={cn(
                    'text-[10px] w-14 font-bold uppercase tracking-widest',
                    item.highlight ? 'text-primary' : 'text-on-surface-variant',
                  )}
                >
                  {item.range}
                </span>
                <div className="flex-1 h-3 bg-surface-dim rounded-full overflow-hidden border border-outline/30">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.value}%` }}
                    className={cn('h-full rounded-full', item.highlight ? 'bg-primary' : 'bg-on-surface-variant/20')}
                  />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant w-10 text-right">
                  {Math.round(item.value)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-container border border-outline rounded-3xl p-8 shadow-sm">
          <h3 className="font-bold text-xl mb-1">Origem dos Numeros</h3>
          <p className="text-sm text-on-surface-variant mb-10 font-medium">Percentual de saida por faixa numerica.</p>
          <div className="flex items-end justify-between gap-6 h-32 mb-6 px-4">
            {stats.originDistribution.map((item) => (
              <div key={item.name} className="flex-1 flex flex-col items-center gap-3">
                <div className="w-full relative group">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${item.height}%` }}
                    className={cn(
                      'w-full rounded-xl transition-all',
                      item.name === 'Medios' ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-primary-container',
                    )}
                  />
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-extrabold text-on-surface uppercase tracking-widest">{item.name}</span>
                  <div className="text-xs font-bold text-primary mt-1">{Math.round(item.value)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightCard({ icon: Icon, title, subtitle, value, color }: any) {
  const colorMap = {
    primary: 'border-primary text-primary',
    tertiary: 'border-tertiary text-tertiary',
    outline: 'border-outline text-outline',
    gray: 'border-outline text-on-surface-variant',
    light: 'border-primary/40 text-primary',
  };

  return (
    <div
      className={cn(
        'bg-surface-container rounded-2xl p-5 border-l-4 transition-all hover:bg-surface-container-high hover:translate-x-1',
        colorMap[color as keyof typeof colorMap],
      )}
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center">
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">{title}</p>
          <h4 className="font-manrope font-bold text-lg text-on-surface">{subtitle}</h4>
          <p className="text-sm font-medium mt-1">{value}</p>
        </div>
      </div>
    </div>
  );
}

