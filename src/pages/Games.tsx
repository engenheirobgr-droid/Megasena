import { 
  CheckCircle2, 
  History, 
  Edit3, 
  Trash2, 
  Plus,
  PlusCircle,
  Target,
  LineChart,
  ArrowUpRight,
  BarChart3
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function GamesPage() {
  return (
    <div className="space-y-8">
      {/* Search & Action Bar */}
      <section className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <h2 className="text-3xl font-extrabold text-on-surface">Meus Jogos</h2>
        <button className="green-gradient-btn px-8 py-3.5 rounded-2xl text-white font-bold uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-primary/20 transition-all hover:translate-y-[-2px] active:scale-95">
          <Plus className="w-5 h-5" />
          Registrar Novo Jogo
        </button>
      </section>

      {/* Bento Grid */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Main Analysis Card */}
        <div className="md:col-span-8 bg-surface-container border border-outline rounded-3xl p-8 shadow-sm">
          <div className="flex justify-between items-start mb-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary bg-primary-container px-3 py-1 rounded-full">Principal</span>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-on-surface-variant">Criado em 12/03/26</span>
              </div>
              <h3 className="text-2xl font-bold font-manrope font-inter">Análise de Performance</h3>
            </div>
            <button className="p-3 bg-surface-dim border border-outline/50 rounded-xl hover:bg-primary-container hover:text-primary transition-all shadow-sm">
              <LineChart className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-3 mb-10">
            {[10, 22, 34, 45, 51, 58].map((num) => (
              <div key={num} className="w-14 h-14 bg-surface-dim border border-outline rounded-xl flex items-center justify-center font-bold text-xl text-on-surface shadow-sm transition-all hover:scale-110">
                {num}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <StatBox label="Frequência" value="85%" sub="Muito Alta" highlight />
            <StatBox label="Último Hit" value="03" sub="Sorteios atrás" />
            <StatBox label="Ocorrências" value="12" sub="No último ano" />
            <StatBox label="Tendência" value="+12%" sub="Em ascensão" positive />
          </div>

          <button className="w-full mt-10 py-5 bg-surface-dim border border-outline/50 rounded-2xl font-bold uppercase tracking-[0.2em] text-on-surface-variant hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all flex items-center justify-center gap-3 active:scale-[0.99] group">
            <Target className="w-5 h-5 transition-transform group-hover:scale-110" />
            Simular Desempenho Histórico
          </button>
        </div>

        {/* Small Game Card */}
        <div className="md:col-span-4 flex flex-col gap-6">
          <div className="flex-1 bg-surface-container border border-outline rounded-3xl p-8 shadow-sm relative overflow-hidden group hover:border-primary/30 transition-all">
             <div className="absolute top-0 right-0 p-6">
                <ArrowUpRight className="w-6 h-6 text-on-surface-variant/20 group-hover:text-primary transition-colors" />
             </div>
             <div className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest mb-2">Carteira Potencial</div>
             <h4 className="text-4xl font-extrabold text-on-surface mb-6">R$ 1.152</h4>
             <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                   <span className="font-bold text-on-surface-variant">Prêmio Acumulado</span>
                   <span className="font-bold text-primary">+ R$ 450</span>
                </div>
                <div className="h-1.5 bg-surface-dim rounded-full overflow-hidden border border-outline/30">
                   <div className="h-full bg-primary w-[65%]" />
                </div>
             </div>
          </div>

          <GameActionCard icon={History} label="Histórico de Jogos" count={24} />
          <GameActionCard icon={Trash2} label="Jogos Arquivados" count={3} warning />
        </div>
      </section>

      {/* Grid of Other Games */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        <MiniGameCard numbers={[1, 5, 23, 44, 45, 59]} hits={4} date="Ontem" />
        <MiniGameCard numbers={[10, 11, 12, 13, 14, 15]} hits={2} date="08/04" />
        <MiniGameCard numbers={[2, 18, 29, 31, 40, 52]} hits={6} date="05/04" jackpot />
      </section>
    </div>
  );
}

function StatBox({ label, value, sub, highlight, positive }: any) {
  return (
    <div className={cn(
      "p-5 rounded-2xl border transition-all",
      highlight ? "bg-primary-container/20 border-primary/20" : "bg-white border-outline shadow-sm"
    )}>
      <p className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest mb-2">{label}</p>
      <p className={cn("text-2xl font-bold font-inter", highlight && "text-primary")}>{value}</p>
      <p className={cn("text-[9px] font-bold uppercase tracking-widest mt-1", positive ? "text-primary" : "text-on-surface-variant/50")}>{sub}</p>
    </div>
  );
}

function GameActionCard({ icon: Icon, label, count, warning }: any) {
  return (
    <button className="flex items-center justify-between p-6 bg-surface-container border border-outline rounded-3xl shadow-sm hover:border-primary/20 transition-all group overflow-hidden relative">
      <div className="flex items-center gap-4 relative z-10">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
          warning ? "bg-error-container text-error" : "bg-primary-container text-primary"
        )}>
          <Icon className="w-6 h-6" />
        </div>
        <span className="font-bold text-on-surface group-hover:text-primary transition-colors">{label}</span>
      </div>
      <span className="text-xl font-bold text-on-surface-variant/40 group-hover:text-primary/40 transition-colors relative z-10">{count}</span>
      <div className="absolute inset-0 bg-primary/5 translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out" />
    </button>
  );
}

function MiniGameCard({ numbers, hits, date, jackpot }: any) {
  return (
    <div className={cn(
      "bg-surface-container border border-outline p-6 rounded-3xl shadow-sm transition-all hover:scale-[1.02] relative overflow-hidden",
      jackpot && "ring-2 ring-primary/20"
    )}>
      {jackpot && (
        <div className="absolute top-0 right-0 py-1 px-4 bg-primary text-white text-[9px] font-bold uppercase tracking-widest rounded-bl-xl shadow-lg">Jackpot</div>
      )}
      <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4 flex justify-between">
        <span>Sorteio {date}</span>
        <span className="text-primary">{hits} Acertos</span>
      </div>
      <div className="grid grid-cols-6 gap-2">
        {numbers.map((n) => (
          <div key={n} className="aspect-square bg-surface-dim border border-outline flex items-center justify-center rounded-lg text-xs font-bold text-on-surface shadow-inner">
            {n}
          </div>
        ))}
      </div>
    </div>
  );
}
