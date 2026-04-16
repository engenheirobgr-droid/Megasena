import { useState } from 'react';
import { 
  History, 
  Play, 
  Settings, 
  Search, 
  CheckCircle2, 
  XCircle,
  HelpCircle,
  ChevronRight,
  Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function SimulatorPage() {
  const [isSimulating, setIsSimulating] = useState(false);

  return (
    <div className="space-y-8">
      {/* Simulation Controls Card */}
      <section className="bg-surface-container border border-outline rounded-3xl p-8 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex-1 space-y-4">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                   <Settings className="w-6 h-6 animate-spin-slow" />
                </div>
                <h2 className="text-2xl font-bold">Configuração da Simulação</h2>
             </div>
             <p className="text-sm text-on-surface-variant font-medium leading-relaxed max-w-lg">
                Selecione um jogo e o período histórico para validar sua estratégia. Nossa base de dados contém todos os sorteios de 1996 até hoje.
             </p>
          </div>
          
          <div className="flex flex-wrap gap-4 w-full md:w-auto">
             <div className="flex-1 md:flex-none">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant mb-2 block px-1">Conjunto</label>
                <select className="w-full bg-surface-dim border border-outline/50 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer">
                   <option>Jogo Principal (6 dezenas)</option>
                   <option>Jogo Secundário (6 dezenas)</option>
                </select>
             </div>
             <div className="flex-1 md:flex-none">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant mb-2 block px-1">Período</label>
                <select className="w-full bg-surface-dim border border-outline/50 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer">
                   <option>Últimos 10 anos</option>
                   <option>Todo o histórico</option>
                   <option>Último ano</option>
                </select>
             </div>
             <button 
                onClick={() => setIsSimulating(true)}
                className="w-full md:w-auto mt-auto green-gradient-btn px-10 py-3.5 rounded-xl text-white font-bold uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-3"
             >
                <Play className="w-4 h-4 fill-current" />
                Simular AGORA
             </button>
          </div>
        </div>
      </section>

      {/* Results HUD */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <ResultHUDCard label="Total Investido" value="R$ 1.152" unit="256 apostas" />
         <ResultHUDCard label="Prêmios Ganhos" value="R$ 480" unit="12 acertos" />
         <ResultHUDCard label="Ponto de Equilíbrio" value="- R$ 672" unit="Net Balance" negative />
      </section>

      {/* Simulation Results Feed */}
      <section className="bg-surface-container border border-outline rounded-3xl overflow-hidden shadow-sm">
         <div className="px-8 py-6 border-b border-outline/50 flex justify-between items-center bg-surface-dim/30">
            <div className="flex items-center gap-3">
               <History className="w-5 h-5 text-primary" />
               <h3 className="font-bold">Timeline de Resultados</h3>
            </div>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                  <div className="w-2 h-2 rounded-full bg-primary" /> Quadra+
               </div>
               <div className="flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                  <div className="w-2 h-2 rounded-full bg-on-surface/10" /> Sem acertos
               </div>
            </div>
         </div>

         <div className="p-8">
            <div className="grid grid-cols-10 grid-rows-10 gap-2 mb-10 overflow-hidden rounded-xl">
               {Array.from({ length: 100 }).map((_, i) => {
                  const hit = Math.random() > 0.85;
                  return (
                     <div 
                        key={i} 
                        className={cn(
                           "aspect-square rounded transition-all cursor-pointer hover:border-black/10 border border-transparent",
                           hit ? "bg-primary shadow-sm shadow-primary/20" : "bg-surface-dim border-outline/50"
                        )}
                        title={hit ? `Acerto no Concurso ${2800 - i}` : 'Nenhum acerto significativo'}
                     />
                  );
               })}
            </div>

            <div className="space-y-2">
               <h4 className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest mb-4 px-1">Últimos Acertos Detalhados</h4>
               <SimulationHistoryRow date="12/03/2026" concurso="2.840" points={4} prize="R$ 450,00" />
               <SimulationHistoryRow date="05/01/2026" concurso="2.810" points={3} prize="R$ 15,00" />
               <SimulationHistoryRow date="20/11/2025" concurso="2.780" points={4} prize="R$ 380,00" />
            </div>
         </div>

         <button className="w-full py-5 bg-surface-dim border-t border-outline/30 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center gap-2">
            Ver Relatório Completo (JSON)
            <ChevronRight className="w-4 h-4" />
         </button>
      </section>
    </div>
  );
}

function ResultHUDCard({ label, value, unit, negative }: any) {
  return (
    <div className="bg-white border border-outline p-6 rounded-3xl shadow-sm transition-all hover:translate-y-[-4px]">
       <p className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest mb-1">{label}</p>
       <div className="flex items-baseline gap-2">
          <p className={cn("text-3xl font-bold font-inter", negative ? "text-error" : "text-on-surface")}>{value}</p>
          <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">{unit}</p>
       </div>
    </div>
  );
}

function SimulationHistoryRow({ date, concurso, points, prize }: any) {
  return (
    <div className="flex items-center justify-between p-5 bg-surface-dim/40 border border-outline/20 rounded-2xl hover:bg-white hover:border-outline/50 transition-all group cursor-pointer shadow-sm">
       <div className="flex items-center gap-6">
          <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-50 group-hover:text-primary transition-colors">{date}</div>
          <div className="px-3 py-1 bg-white border border-outline/50 rounded-lg text-xs font-bold font-manrope">Concurso {concurso}</div>
       </div>
       <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
             <div className="flex gap-1">
                {Array.from({ length: 6 }).map((_, i) => (
                   <div key={i} className={cn("w-2 h-2 rounded-full", i < points ? "bg-primary" : "bg-outline/30")} />
                ))}
             </div>
             <span className="text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant">{points} Pt</span>
          </div>
          <div className="text-sm font-bold text-primary">{prize}</div>
       </div>
    </div>
  );
}
