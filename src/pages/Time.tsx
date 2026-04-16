import { useState, useEffect } from 'react';
import { 
  Play, 
  Square, 
  AlertTriangle, 
  Timer, 
  Calendar, 
  History,
  ArrowRight,
  Clock
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function TimePage() {
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(2597); // 43:17

  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8">
      {/* Session Hero */}
      <section className="bg-surface-container border border-outline rounded-3xl p-6 sm:p-12 text-center relative overflow-hidden shadow-sm">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
           <img 
            src="https://picsum.photos/seed/time/800/800" 
            alt="Clock Graphic" 
            className="w-full h-full object-cover grayscale"
            referrerPolicy="no-referrer"
           />
        </div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-8 animate-pulse shadow-xl shadow-primary/5 border border-primary/10">
            <Clock className="w-8 h-8" />
          </div>
          
          <span className="text-[10px] text-on-surface-variant font-extrabold uppercase tracking-[0.3em] mb-4">
            Tempo de Análise Atual
          </span>
          
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter text-on-surface mb-10 md:mb-12 font-inter">
            {formatTime(seconds)}
          </h1>

          <div className="flex flex-wrap justify-center gap-4">
            <button 
              onClick={() => setIsActive(!isActive)}
              className="flex items-center gap-3 px-6 md:px-12 py-3 md:py-4 green-gradient-btn text-white rounded-2xl font-bold uppercase tracking-widest shadow-2xl shadow-primary/20 hover:translate-y-[-2px] active:scale-95 transition-all"
            >
              {isActive ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              {isActive ? 'Suspender' : 'Retomar Sessão'}
            </button>
            <button className="flex items-center gap-3 px-6 md:px-12 py-3 md:py-4 bg-surface-dim border border-outline text-on-surface-variant rounded-2xl font-bold uppercase tracking-widest transition-all hover:bg-white active:scale-95">
              <History className="w-5 h-5" />
              Concluir
            </button>
          </div>
        </div>
      </section>

      {/* Alert Component */}
      <section className="bg-white border border-outline rounded-3xl p-5 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-error-container text-error rounded-xl flex items-center justify-center shadow-sm">
               <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
               <p className="font-bold text-sm">Tempo de uso elevado.</p>
               <p className="text-xs text-on-surface-variant font-medium mt-0.5">Você já atingiu 75% da sua meta diária recomendada.</p>
            </div>
          </div>
          <span className="text-[10px] font-extrabold text-primary uppercase tracking-[0.2em] mt-4 md:mt-0 px-3 py-1 bg-primary/5 border border-primary/10 rounded-full">
            Nível: Crítico
          </span>
        </div>
        <div className="h-4 w-full bg-surface-dim rounded-full overflow-hidden p-1 shadow-inner border border-outline/50">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: '75%' }}
            className="h-full bg-gradient-to-r from-primary to-primary-fixed-dim rounded-full shadow-lg shadow-primary/20" 
          />
        </div>
      </section>

      {/* History Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TimeStatCard icon={Timer} label="Esta Semana" value="2h 14m" active />
        <TimeStatCard icon={Calendar} label="Este Mês" value="8h 03m" />
        <TimeStatCard icon={History} label="Consolidado" value="34h 20m" muted />
      </section>

      {/* Detail List */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight text-on-surface px-1">Registros Recentes</h2>
        
        <div className="grid grid-cols-1 gap-4">
          <SessionLogItem date="Hoje, 16 de Abril" time="14:30" duration="00:52:10" active />
          <SessionLogItem date="Ontem, 15 de Abril" time="09:15" duration="01:22:04" />
          <SessionLogItem date="Segunda, 13 de Abril" time="20:00" duration="00:30:15" />
        </div>
      </section>

      {/* Footer Disclaimer */}
      <footer className="pt-12 pb-16 flex flex-col items-center border-t border-outline/30">
        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4 opacity-50">Jogue com Responsabilidade</p>
        <a 
          href="https://jogo-responsavel.org.br" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest hover:underline group"
        >
          Portal de Ajuda e Suporte
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </a>
      </footer>
    </div>
  );
}

function TimeStatCard({ icon: Icon, label, value, active, muted }: any) {
  return (
    <div className={cn(
      "bg-white border border-outline p-6 rounded-3xl shadow-sm transition-all hover:translate-y-[-4px]",
      active ? "border-primary/40 ring-4 ring-primary/5" : "hover:border-primary/20",
      muted && "opacity-60"
    )}>
      <div className="flex items-center gap-3 mb-6">
        <div className={cn("p-2 rounded-lg", active ? "bg-primary-container text-primary" : "bg-surface-dim text-on-surface-variant")}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-[10px] uppercase font-extrabold tracking-[0.2em] text-on-surface-variant font-inter">{label}</span>
      </div>
      <div className="text-3xl font-black font-inter tracking-tighter">{value}</div>
    </div>
  );
}

function SessionLogItem({ date, time, duration, active }: any) {
  return (
    <div className={cn(
      "flex items-center justify-between p-6 rounded-2xl transition-all cursor-pointer group shadow-sm border",
      active ? "bg-primary-container/20 border-primary/20" : "bg-white border-outline hover:border-primary/30"
    )}>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">{date}</span>
        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-60">Sessão iniciada às {time}</span>
      </div>
      <div className="flex flex-col items-end">
        <span className={cn("text-2xl font-black font-inter tracking-tighter", active ? "text-primary" : "text-on-surface")}>{duration}</span>
        <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-on-surface-variant opacity-40">Tempo Analisado</span>
      </div>
    </div>
  );
}
