import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  Cell,
  Tooltip
} from 'recharts';
import { Flame, Snowflake, Award, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

const sumData = [
  { range: '60-100', value: 15 },
  { range: '100-150', value: 45 },
  { range: '150-230', value: 85, highlight: true },
  { range: '230-280', value: 30 },
  { range: '280-350', value: 10 },
];

const originData = [
  { name: 'Baixos', value: 33, range: '(1-20)', height: 65 },
  { name: 'Médios', value: 42, range: '(21-40)', height: 85 },
  { name: 'Altos', value: 25, range: '(41-60)', height: 50 },
];

export default function StatsPage() {
  const numbers = [4, 15, 22, 35, 41, 58];

  return (
    <div className="space-y-8">
      {/* Last Draw Section - Hero Card Style */}
      <section className="green-gradient-btn rounded-3xl p-10 relative overflow-hidden shadow-2xl shadow-primary/20 transition-all hover:scale-[1.01]">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-40 -mt-40 blur-3xl" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <span className="font-bold text-white/70 uppercase tracking-[0.2em] text-[10px]">
              Último Sorteio
            </span>
            <h2 className="text-3xl font-extrabold text-white mt-1">
              Concurso 2.850 · Sábado, 12/04/2026
            </h2>
          </div>
          <div className="text-right">
            <div className="bg-white/20 text-white backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest inline-block mb-2">
              Acumulou
            </div>
            <p className="text-white font-bold text-lg leading-tight">
              Próximo prêmio estimado:<br />
              <span className="text-4xl">R$ 47 milhões</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 mt-12 relative z-10">
          {numbers.map((num) => (
            <motion.div
              key={num}
              whileHover={{ scale: 1.1, y: -5 }}
              className="w-16 h-16 md:w-24 md:h-24 bg-white/15 backdrop-blur-lg border border-white/20 rounded-2xl flex items-center justify-center shadow-xl transition-all"
            >
              <span className="font-extrabold text-3xl md:text-4xl text-white">
                {num.toString().padStart(2, '0')}
              </span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Grid: Heatmap and Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Heatmap Section */}
        <div className="lg:col-span-8 bg-surface-container border border-outline rounded-3xl p-8 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-bold text-xl">Volante de Calor</h3>
            <div className="flex bg-surface-dim p-1 rounded-xl border border-outline/50">
              <button className="px-5 py-2 text-[10px] font-bold uppercase tracking-widest bg-white text-primary rounded-lg shadow-sm">
                Todos os tempos
              </button>
              <button className="px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface">
                Último ano
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-10 gap-2 md:gap-3">
            {Array.from({ length: 60 }, (_, i) => i + 1).map((num) => {
              const intensity = Math.random();
              return (
                <div 
                  key={num}
                  className={cn(
                    "aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all hover:ring-2 hover:ring-primary/40 cursor-help",
                    intensity > 0.8 ? "bg-primary text-white shadow-md shadow-primary/20" :
                    intensity > 0.5 ? "bg-primary-container text-primary" :
                    intensity > 0.3 ? "bg-primary-container/40 text-on-surface-variant" :
                    "bg-surface-dim text-on-surface-variant/40 border border-outline/30"
                  )}
                >
                  {num.toString().padStart(2, '0')}
                </div>
              );
            })}
          </div>
          
          <div className="mt-8 flex gap-6 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-primary" /> Saiu muitas vezes
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-surface-dim border border-outline/50" /> Saiu poucas vezes
            </div>
          </div>
        </div>

        {/* Insights Section */}
        <div className="lg:col-span-4 space-y-4">
          <InsightCard 
            icon={Flame} 
            title="Mais frequente" 
            subtitle="Quem mais aparece" 
            value="Número 10 · 320 vezes" 
            color="primary" 
          />
          <InsightCard 
            icon={Snowflake} 
            title="Mais ausente" 
            subtitle="Sumido há mais tempo" 
            value="Número 55 · 38 sorteios" 
            color="gray" 
          />
          <InsightCard 
            icon={Award} 
            title="Par ou ímpar?" 
            subtitle="Como costuma sair" 
            value="3 pares + 3 ímpares" 
            color="light" 
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-surface-container border border-outline rounded-3xl p-8 shadow-sm">
          <h3 className="font-bold text-xl mb-1">Distribuição da Soma</h3>
          <p className="text-sm text-on-surface-variant mb-10 font-medium">Frequência por intervalo de soma dos números.</p>
          <div className="space-y-6">
            {sumData.map((item) => (
              <div key={item.range} className="flex items-center gap-4">
                <span className={cn(
                  "text-[10px] w-14 font-bold uppercase tracking-widest",
                  item.highlight ? "text-primary" : "text-on-surface-variant"
                )}>
                  {item.range}
                </span>
                <div className="flex-1 h-3 bg-surface-dim rounded-full overflow-hidden border border-outline/30">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${item.value}%` }}
                    className={cn(
                      "h-full rounded-full transition-all",
                      item.highlight ? "bg-primary" : "bg-on-surface-variant/20"
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-container border border-outline rounded-3xl p-8 shadow-sm">
          <h3 className="font-bold text-xl mb-1">Origem dos Números</h3>
          <p className="text-sm text-on-surface-variant mb-10 font-medium">Percentual de saída por faixa numérica.</p>
          <div className="flex items-end justify-between gap-6 h-32 mb-6 px-4">
            {originData.map((item) => (
              <div key={item.name} className="flex-1 flex flex-col items-center gap-3">
                <div className="w-full relative group">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${item.height}%` }}
                    className={cn(
                      "w-full rounded-xl transition-all",
                      item.name === 'Médios' ? "bg-primary shadow-lg shadow-primary/20" : "bg-primary-container"
                    )}
                  />
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-extrabold text-on-surface uppercase tracking-widest">{item.name}</span>
                  <div className="text-xs font-bold text-primary mt-1">{item.value}%</div>
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
    primary: "border-primary text-primary",
    tertiary: "border-tertiary text-tertiary",
    outline: "border-outline text-outline",
  };

  return (
    <div className={cn(
      "bg-surface-container rounded-2xl p-5 border-l-4 transition-all hover:bg-surface-container-high hover:translate-x-1",
      colorMap[color as keyof typeof colorMap]
    )}>
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