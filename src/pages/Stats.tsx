import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import { motion } from 'motion/react';
import {
  Award,
  Filter,
  Flame,
  Landmark,
  RefreshCcw,
  Search,
  Snowflake,
  TrendingUp,
  UploadCloud,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  analyzeSelectedNumbers,
  applyStatsFilter,
  buildMegaStats,
  findDrawByConcurso,
  formatNumberBadge,
} from '../lib/stats';
import { fetchAllDraws, importDrawsWorkbook } from '../lib/draws';
import { useAuth } from '../contexts/AuthContext';
import type { Draw } from '../types';

type WindowOption = 'all' | '50' | '100' | '500' | '1000';

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

function windowOptionToSize(option: WindowOption): number | null {
  if (option === 'all') return null;
  const parsed = Number(option);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseNumbersFromInput(raw: string): number[] {
  const parsed = raw
    .split(/[^0-9]+/)
    .map((token) => Number(token))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 60);

  return [...new Set(parsed)].slice(0, 6).sort((a, b) => a - b);
}

function isConsecutiveSequence(values: number[]): boolean {
  if (values.length <= 1) return true;
  const sorted = [...values].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] - sorted[i - 1] !== 1) return false;
  }
  return true;
}

function drawContainsNumbers(draw: Draw, numbers: number[]): boolean {
  return numbers.every((num) => draw.numbers.includes(num));
}

export default function StatsPage() {
  const { firebaseReady, authError } = useAuth();
  const [draws, setDraws] = useState<Draw[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  const [windowOption, setWindowOption] = useState<WindowOption>('500');
  const [yearFrom, setYearFrom] = useState<string>('');
  const [yearTo, setYearTo] = useState<string>('');

  const [selectedNumbersText, setSelectedNumbersText] = useState<string>('');
  const [contestQuery, setContestQuery] = useState<string>('');
  const [sequenceSearchText, setSequenceSearchText] = useState<string>('');
  const [sequenceMode, setSequenceMode] = useState<'numbers' | 'sequence'>('numbers');

  const loadDraws = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadDraws();
  }, [loadDraws]);

  const globalStats = useMemo(() => buildMegaStats(draws), [draws]);

  const yearFromNumber = Number(yearFrom);
  const yearToNumber = Number(yearTo);

  const filteredDraws = useMemo(
    () =>
      applyStatsFilter(draws, {
        windowSize: windowOptionToSize(windowOption),
        yearFrom: Number.isInteger(yearFromNumber) ? yearFromNumber : null,
        yearTo: Number.isInteger(yearToNumber) ? yearToNumber : null,
      }),
    [draws, windowOption, yearFromNumber, yearToNumber],
  );

  const stats = useMemo(() => buildMegaStats(filteredDraws), [filteredDraws]);
  const latest = stats.latestDraw;

  const selectedNumbers = useMemo(() => parseNumbersFromInput(selectedNumbersText), [selectedNumbersText]);
  const selectedInsights = useMemo(
    () => analyzeSelectedNumbers(filteredDraws, selectedNumbers),
    [filteredDraws, selectedNumbers],
  );

  const sequenceQueryNumbers = useMemo(() => parseNumbersFromInput(sequenceSearchText), [sequenceSearchText]);
  const sequenceInputIsValid = useMemo(
    () => (sequenceMode === 'numbers' ? true : isConsecutiveSequence(sequenceQueryNumbers)),
    [sequenceMode, sequenceQueryNumbers],
  );
  const sequenceMatches = useMemo(() => {
    if (!sequenceQueryNumbers.length || !sequenceInputIsValid) return [];
    return filteredDraws
      .filter((draw) => drawContainsNumbers(draw, sequenceQueryNumbers))
      .sort((a, b) => b.concurso - a.concurso);
  }, [filteredDraws, sequenceInputIsValid, sequenceQueryNumbers]);

  const contestNumber = Number(contestQuery);
  const contestResult = useMemo(() => {
    if (!Number.isInteger(contestNumber) || contestNumber <= 0) return null;
    return findDrawByConcurso(draws, contestNumber);
  }, [draws, contestNumber]);

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

  const yearMin = globalStats.yearRange.min;
  const yearMax = globalStats.yearRange.max;

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
              disabled={importing}
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-widest transition-all',
                'green-gradient-btn text-white hover:opacity-90 disabled:opacity-60',
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

        {importSummary ? <p className="mt-4 text-sm font-medium text-primary">{importSummary}</p> : null}
        {!firebaseReady ? (
          <p className="mt-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Firebase indisponivel neste build: importacao e leitura funcionando em modo local no navegador.
          </p>
        ) : null}
        {authError ? <p className="mt-2 text-sm font-medium text-error">{authError}</p> : null}
        {error ? <p className="mt-4 text-sm font-medium text-error">{error}</p> : null}
      </section>

      <section className="bg-surface-container border border-outline rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            <Filter className="w-4 h-4" />
            Filtros de analise
          </span>
          {([
            { id: '50', label: '50' },
            { id: '100', label: '100' },
            { id: '500', label: '500' },
            { id: '1000', label: '1000' },
            { id: 'all', label: 'Tudo' },
          ] as const).map((item) => (
            <button
              key={item.id}
              onClick={() => setWindowOption(item.id)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all',
                windowOption === item.id
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-on-surface-variant border-outline hover:border-primary/30 hover:text-primary',
              )}
            >
              {item.label}
            </button>
          ))}

          <span className="ml-auto text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            {stats.totalDraws} concursos analisados
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Ano inicial</label>
            <input
              type="number"
              min={yearMin || undefined}
              max={yearMax || undefined}
              placeholder={yearMin ? String(yearMin) : 'Ex: 2010'}
              value={yearFrom}
              onChange={(e) => setYearFrom(e.target.value)}
              className="w-full rounded-xl border border-outline bg-white px-3 py-2 text-sm font-medium"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Ano final</label>
            <input
              type="number"
              min={yearMin || undefined}
              max={yearMax || undefined}
              placeholder={yearMax ? String(yearMax) : 'Ex: 2026'}
              value={yearTo}
              onChange={(e) => setYearTo(e.target.value)}
              className="w-full rounded-xl border border-outline bg-white px-3 py-2 text-sm font-medium"
            />
          </div>
        </div>

        <p className="text-xs text-on-surface-variant font-medium">
          Intervalo historico detectado: {yearMin || '-'} ate {yearMax || '-'}.
        </p>
      </section>

      <section className="green-gradient-btn rounded-3xl p-8 md:p-10 relative overflow-hidden shadow-2xl shadow-primary/20 transition-all hover:scale-[1.01]">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-40 -mt-40 blur-3xl" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <span className="font-bold text-white/70 uppercase tracking-[0.2em] text-[10px]">Ultimo Sorteio da Janela</span>
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
              Premio estimado:
              <br />
              <span className="text-3xl md:text-4xl">{latest ? formatCurrency(latest.estimatedPrize) : 'R$ 0'}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-4 mt-6 md:mt-8 relative z-10">
          {(latest?.numbers || [0, 0, 0, 0, 0, 0]).map((num, idx) => (
            <motion.div
              key={`${num}-${idx}`}
              whileHover={{ scale: 1.08, y: -4 }}
              className="w-12 h-12 sm:w-16 sm:h-16 md:w-24 md:h-24 bg-white/15 backdrop-blur-lg border border-white/20 rounded-2xl flex items-center justify-center shadow-xl"
            >
              <span className="font-extrabold text-xl sm:text-3xl md:text-4xl text-white">{String(num).padStart(2, '0')}</span>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Soma media" value={stats.averageSum.toFixed(1)} />
        <KpiCard label="Repete do concurso anterior" value={stats.averageRepeatsFromPrevious.toFixed(2)} />
        <KpiCard label="Tem sequencia consecutiva" value={`${stats.consecutivePairRate.toFixed(1)}%`} />
        <KpiCard label="Paridade dominante" value={`${stats.parityPattern.evens}P-${stats.parityPattern.odds}I`} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-surface-container border border-outline rounded-3xl p-5 md:p-8 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-bold text-xl">Volante de Calor</h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Frequencia na janela</span>
          </div>
          <div className="grid grid-cols-10 gap-1 sm:gap-2 md:gap-3">
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
                {formatNumberBadge(item.num)}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <InsightCard
            icon={Flame}
            title="Mais frequente"
            subtitle="Quem mais aparece"
            value={`Numero ${formatNumberBadge(stats.mostFrequent.number)} · ${stats.mostFrequent.count} vezes`}
            color="primary"
          />
          <InsightCard
            icon={Snowflake}
            title="Mais ausente"
            subtitle="Sem sair ha mais"
            value={`Numero ${formatNumberBadge(stats.mostAbsent.number)} · ${stats.mostAbsent.draws} concursos`}
            color="gray"
          />
          <InsightCard
            icon={Award}
            title="Padrao dominante"
            subtitle="Paridade mais recorrente"
            value={`${stats.parityPattern.evens} pares + ${stats.parityPattern.odds} impares`}
            color="light"
          />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RankingCard title="Top 10 Frequentes" items={stats.topFrequent} />
        <RankingCard title="Top 10 Atrasadas" items={stats.topAbsent} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <ComboRankingCard title="Pares mais recorrentes" subtitle="Combinacoes de 2 dezenas" items={stats.topPairs} />
        <ComboRankingCard title="Trincas mais recorrentes" subtitle="Combinacoes de 3 dezenas" items={stats.topTriples} />
        <ComboRankingCard title="Sequencias consecutivas" subtitle="Pares consecutivos que mais saem" items={stats.topConsecutivePairs} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-surface-container border border-outline rounded-3xl p-5 md:p-8 shadow-sm">
          <h3 className="font-bold text-xl mb-1">Distribuicao da Soma</h3>
          <p className="text-sm text-on-surface-variant mb-8 font-medium">Frequencia por intervalo da soma das dezenas.</p>
          <div className="space-y-5">
            {stats.sumDistribution.map((item) => (
              <div key={item.range} className="flex items-center gap-4">
                <span className={cn('text-[10px] w-16 font-bold uppercase tracking-widest', item.highlight ? 'text-primary' : 'text-on-surface-variant')}>
                  {item.range}
                </span>
                <div className="flex-1 h-3 bg-surface-dim rounded-full overflow-hidden border border-outline/30">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.value}%` }}
                    className={cn('h-full rounded-full', item.highlight ? 'bg-primary' : 'bg-on-surface-variant/20')}
                  />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant w-12 text-right">
                  {Math.round(item.value)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-container border border-outline rounded-3xl p-5 md:p-8 shadow-sm">
          <h3 className="font-bold text-xl mb-1">Distribuicao de Paridade</h3>
          <p className="text-sm text-on-surface-variant mb-8 font-medium">Faixas de pares/impares por concurso.</p>
          <div className="space-y-5">
            {stats.parityDistribution.map((item) => (
              <div key={item.label} className="flex items-center gap-4">
                <span className={cn('text-[10px] w-16 font-bold uppercase tracking-widest', item.highlight ? 'text-primary' : 'text-on-surface-variant')}>
                  {item.label}
                </span>
                <div className="flex-1 h-3 bg-surface-dim rounded-full overflow-hidden border border-outline/30">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.value}%` }}
                    className={cn('h-full rounded-full', item.highlight ? 'bg-primary' : 'bg-on-surface-variant/20')}
                  />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant w-12 text-right">
                  {Math.round(item.value)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface-container border border-outline rounded-3xl p-5 md:p-8 shadow-sm">
        <h3 className="font-bold text-xl mb-1">Origem dos Numeros</h3>
        <p className="text-sm text-on-surface-variant mb-10 font-medium">Percentual de saida por faixa numerica.</p>
        <div className="flex items-end justify-between gap-6 h-40 mb-6 px-4">
          {stats.originDistribution.map((item) => (
            <div key={item.name} className="flex-1 flex flex-col items-center gap-3">
              <div className="w-full relative group h-full flex items-end">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${item.height}%` }}
                  className={cn('w-full rounded-xl transition-all', item.name === 'Medios' ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-primary-container')}
                />
              </div>
              <div className="text-center">
                <span className="text-[10px] font-extrabold text-on-surface uppercase tracking-widest">{item.name}</span>
                <div className="text-xs font-bold text-primary mt-1">{Math.round(item.value)}%</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-surface-container border border-outline rounded-3xl p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Landmark className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-xl">Maiores valores da historia</h3>
          </div>
          <p className="text-sm text-on-surface-variant mb-6 font-medium">Recordes por premio e arrecadacao.</p>
          <div className="space-y-3">
            <RecordCard label="Maior premio da sena" value={stats.highestPrize6.value} draw={stats.highestPrize6.draw} />
            <RecordCard label="Maior premio estimado" value={stats.highestEstimatedPrize.value} draw={stats.highestEstimatedPrize.draw} />
            <RecordCard label="Maior arrecadacao" value={stats.highestRevenue.value} draw={stats.highestRevenue.draw} />
            <RecordCard label="Maior acumulado" value={stats.highestAccumulated.value} draw={stats.highestAccumulated.draw} />
          </div>
        </div>

        <StateRankingCard title="Estados que mais aparecem" items={stats.topStates} />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-surface-container border border-outline rounded-3xl p-5 md:p-8 shadow-sm space-y-5">
          <h3 className="font-bold text-xl">Analise por dezenas escolhidas</h3>
          <p className="text-sm text-on-surface-variant font-medium">
            Digite de 1 a 6 dezenas (ex.: 10 22 33 45) para ver recorrencia e combinacoes com essas dezenas.
          </p>

          <input
            type="text"
            value={selectedNumbersText}
            onChange={(e) => setSelectedNumbersText(e.target.value)}
            placeholder="Ex.: 10 22 33"
            className="w-full rounded-xl border border-outline bg-white px-3 py-2 text-sm font-medium"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <KpiCard compact label="Concursos com todas" value={String(selectedInsights.matchingAllCount)} />
            <KpiCard compact label="Concursos com ao menos 1" value={String(selectedInsights.matchingAnyCount)} />
          </div>

          <ComboRankingCard
            title="Pares com dezenas escolhidas"
            subtitle="Recorrencia com as dezenas informadas"
            items={selectedInsights.topPairsWithSelected}
            compact
          />

          <RankingCard title="Numeros que mais acompanham" items={selectedInsights.topCompanions} compact />

          <div className="text-xs text-on-surface-variant font-medium">
            Ultimos concursos com todas as dezenas:
            {' '}
            {selectedInsights.recentMatchingContests.length
              ? selectedInsights.recentMatchingContests.join(', ')
              : 'nenhum na janela atual'}
          </div>
        </div>

        <div className="bg-surface-container border border-outline rounded-3xl p-5 md:p-8 shadow-sm space-y-5">
          <h3 className="font-bold text-xl">Consulta detalhada por concurso</h3>
          <p className="text-sm text-on-surface-variant font-medium">
            Informe o numero do concurso para ver todos os campos importados da planilha.
          </p>

          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              value={contestQuery}
              onChange={(e) => setContestQuery(e.target.value)}
              placeholder="Ex.: 2820"
              className="flex-1 min-w-0 rounded-xl border border-outline bg-white px-3 py-2 text-sm font-medium"
            />
            <button className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl px-3 md:px-4 py-2 bg-primary text-white text-xs font-bold uppercase tracking-widest">
              <Search className="w-4 h-4" />
              Buscar
            </button>
          </div>

          {contestQuery && !contestResult ? (
            <p className="text-sm font-medium text-error">Concurso nao encontrado na base atual.</p>
          ) : null}

          {contestResult ? <ContestDetail draw={contestResult} /> : null}
        </div>
      </section>

      <section className="bg-surface-container border border-outline rounded-3xl p-5 md:p-8 shadow-sm space-y-5">
        <h3 className="font-bold text-xl">Filtro por numero ou sequencia</h3>
        <p className="text-sm text-on-surface-variant font-medium">
          Digite 1 a 6 dezenas para listar todos os concursos que contem esses numeros.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            value={sequenceSearchText}
            onChange={(e) => setSequenceSearchText(e.target.value)}
            placeholder="Ex.: 10 ou 05 06 07"
            className="md:col-span-2 w-full rounded-xl border border-outline bg-white px-3 py-2 text-sm font-medium"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSequenceMode('numbers')}
              className={cn(
                'flex-1 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-widest',
                sequenceMode === 'numbers' ? 'bg-primary text-white border-primary' : 'bg-white text-on-surface-variant border-outline',
              )}
            >
              Numeros
            </button>
            <button
              onClick={() => setSequenceMode('sequence')}
              className={cn(
                'flex-1 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-widest',
                sequenceMode === 'sequence' ? 'bg-primary text-white border-primary' : 'bg-white text-on-surface-variant border-outline',
              )}
            >
              Sequencia
            </button>
          </div>
        </div>

        {sequenceMode === 'sequence' && sequenceQueryNumbers.length > 1 && !sequenceInputIsValid ? (
          <p className="text-sm font-medium text-error">
            Para modo sequencia, informe dezenas consecutivas (ex.: 05 06 07).
          </p>
        ) : null}

        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          {sequenceQueryNumbers.length
            ? `${sequenceMatches.length} concursos encontrados na base filtrada`
            : 'Digite as dezenas para buscar'}
        </p>

        {sequenceMatches.length ? (
          <div className="max-h-[420px] overflow-auto rounded-2xl border border-outline/40">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface-container-high">
                <tr className="text-left">
                  <th className="px-3 py-2 font-bold uppercase tracking-widest text-[10px] text-on-surface-variant">Concurso</th>
                  <th className="px-3 py-2 font-bold uppercase tracking-widest text-[10px] text-on-surface-variant">Data</th>
                  <th className="px-3 py-2 font-bold uppercase tracking-widest text-[10px] text-on-surface-variant">Dezenas</th>
                  <th className="px-3 py-2 font-bold uppercase tracking-widest text-[10px] text-on-surface-variant">Sena</th>
                </tr>
              </thead>
              <tbody>
                {sequenceMatches.map((draw) => (
                  <tr key={draw.id} className="border-t border-outline/20">
                    <td className="px-3 py-2 font-bold text-on-surface">{draw.concurso}</td>
                    <td className="px-3 py-2 text-on-surface-variant">{formatDate(draw.date)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1.5">
                        {draw.numbers
                          .slice()
                          .sort((a, b) => a - b)
                          .map((num) => (
                            <span
                              key={`${draw.id}-${num}`}
                              className={cn(
                                'inline-flex rounded-full px-2 py-0.5 text-xs font-extrabold',
                                sequenceQueryNumbers.includes(num) ? 'bg-primary text-white' : 'bg-surface-dim text-on-surface',
                              )}
                            >
                              {formatNumberBadge(num)}
                            </span>
                          ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-on-surface-variant">
                      {draw.winners6 > 0 ? `${draw.winners6} ganhador(es)` : 'Acumulou'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function KpiCard({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={cn('bg-surface-container border border-outline rounded-2xl shadow-sm', compact ? 'p-4' : 'p-5')}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</p>
      <p className={cn('font-extrabold text-on-surface mt-2', compact ? 'text-xl' : 'text-2xl')}>{value}</p>
    </div>
  );
}

function RankingCard({
  title,
  items,
  compact = false,
}: {
  title: string;
  items: Array<{ number: number; count: number }>;
  compact?: boolean;
}) {
  const maxValue = Math.max(1, ...items.map((item) => item.count));

  return (
    <div className={cn('bg-surface-container border border-outline rounded-3xl shadow-sm', compact ? 'p-5' : 'p-5 md:p-8')}>
      <div className="flex items-center justify-between mb-5">
        <h3 className={cn('font-bold', compact ? 'text-base' : 'text-xl')}>{title}</h3>
        <TrendingUp className="w-5 h-5 text-primary" />
      </div>

      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.number} className="flex items-center gap-3">
              <span className="w-10 text-sm font-bold text-on-surface">{formatNumberBadge(item.number)}</span>
              <div className="flex-1 h-2.5 bg-surface-dim rounded-full overflow-hidden border border-outline/30">
                <div className="h-full bg-primary" style={{ width: `${(item.count / maxValue) * 100}%` }} />
              </div>
              <span className="w-10 text-right text-xs font-bold text-on-surface-variant">{item.count}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-on-surface-variant">Sem dados para o filtro atual.</p>
      )}
    </div>
  );
}

function ComboRankingCard({
  title,
  subtitle,
  items,
  compact = false,
}: {
  title: string;
  subtitle: string;
  items: Array<{ combo: number[]; count: number }>;
  compact?: boolean;
}) {
  return (
    <div className={cn('bg-surface-container border border-outline rounded-3xl shadow-sm', compact ? 'p-5' : 'p-5 md:p-8')}>
      <h3 className={cn('font-bold', compact ? 'text-base' : 'text-xl')}>{title}</h3>
      <p className="text-sm text-on-surface-variant mt-1 mb-5 font-medium">{subtitle}</p>

      {items.length ? (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={`${item.combo.join('-')}-${index}`} className="flex items-center justify-between rounded-xl border border-outline/40 px-3 py-2">
              <span className="text-sm font-bold text-on-surface">{item.combo.map(formatNumberBadge).join(' - ')}</span>
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{item.count}x</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-on-surface-variant">Sem dados para o filtro atual.</p>
      )}
    </div>
  );
}

function StateRankingCard({
  title,
  items,
}: {
  title: string;
  items: Array<{ state: string; appearances: number; winnersShare: number }>;
}) {
  const maxAppearances = Math.max(1, ...items.map((item) => item.appearances));

  return (
    <div className="bg-surface-container border border-outline rounded-3xl p-8 shadow-sm">
      <h3 className="font-bold text-xl">{title}</h3>
      <p className="text-sm text-on-surface-variant mt-1 mb-6 font-medium">Participacoes em concursos com ganhador da sena.</p>
      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.state} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-on-surface">{item.state}</span>
                <span className="font-medium text-on-surface-variant">{item.appearances} concursos</span>
              </div>
              <div className="h-2.5 bg-surface-dim rounded-full overflow-hidden border border-outline/30">
                <div className="h-full bg-primary" style={{ width: `${(item.appearances / maxAppearances) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-on-surface-variant">Sem dados de estado no filtro atual.</p>
      )}
    </div>
  );
}

function RecordCard({ label, value, draw }: { label: string; value: number; draw: Draw | null }) {
  return (
    <div className="rounded-xl border border-outline/50 bg-surface-container-low px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-on-surface">{label}</span>
        <span className="text-sm font-extrabold text-primary">{formatCurrency(value)}</span>
      </div>
      <p className="text-xs text-on-surface-variant mt-1">{draw ? `Concurso ${draw.concurso} · ${formatDate(draw.date)}` : 'Sem registro'}</p>
    </div>
  );
}

function InsightCard({
  icon: Icon,
  title,
  subtitle,
  value,
  color,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  value: string;
  color: 'primary' | 'gray' | 'light';
}) {
  const colorMap = {
    primary: 'border-primary text-primary',
    gray: 'border-outline text-on-surface-variant',
    light: 'border-primary/40 text-primary',
  };

  return (
    <div
      className={cn(
        'bg-surface-container rounded-2xl p-5 border-l-4 transition-all hover:bg-surface-container-high hover:translate-x-1',
        colorMap[color],
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

function ContestDetail({ draw }: { draw: Draw }) {
  return (
    <div className="rounded-2xl border border-outline/50 bg-surface-container-low p-4 space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Concurso {draw.concurso}</p>
        <p className="text-sm font-medium text-on-surface-variant">{formatDate(draw.date)}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {draw.numbers.map((num) => (
          <span key={num} className="inline-flex h-9 min-w-9 px-2 items-center justify-center rounded-full bg-primary text-white font-extrabold">
            {formatNumberBadge(num)}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <DetailItem label="Ganhadores sena" value={String(draw.winners6)} />
        <DetailItem label="Premio sena" value={formatCurrency(draw.prize6)} />
        <DetailItem label="Ganhadores quina" value={String(draw.winners5)} />
        <DetailItem label="Premio quina" value={formatCurrency(draw.prize5)} />
        <DetailItem label="Ganhadores quadra" value={String(draw.winners4)} />
        <DetailItem label="Premio quadra" value={formatCurrency(draw.prize4)} />
        <DetailItem label="Acumulado sena" value={formatCurrency(draw.accumulated6)} />
        <DetailItem label="Arrecadacao total" value={formatCurrency(draw.totalRevenue)} />
        <DetailItem label="Premio estimado" value={formatCurrency(draw.estimatedPrize)} />
        <DetailItem label="Mega da Virada acumulado" value={formatCurrency(draw.megaDaViradaAccumulated)} />
      </div>

      <DetailItem label="Cidade/UF" value={draw.cityUf || '-'} />
      <DetailItem label="Observacao" value={draw.observation || '-'} />
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</p>
      <p className="text-sm font-semibold text-on-surface mt-0.5">{value}</p>
    </div>
  );
}


