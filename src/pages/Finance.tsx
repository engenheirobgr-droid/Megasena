import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  AlertCircle,
  Plus,
  ArrowUpRight,
  ChevronRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

const historyData = [
  { day: '01', balance: 0 },
  { day: '05', balance: -20 },
  { day: '10', balance: 50 },
  { day: '15', balance: 35 },
  { day: '20', balance: 120 },
  { day: '25', balance: 80 },
  { day: '30', balance: 450 },
];

export default function FinancePage() {
  return (
    <div className="space-y-8">
      {/* Financial Summary */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <FinanceCard label="Total Investido" value="R$ 1.240" delta="-R$ 25 hoje" icon={TrendingDown} />
        <FinanceCard label="Total Prêmios" value="R$ 2.450" delta="+R$ 450 hoje" icon={TrendingUp} positive />
        <FinanceCard label="Saldo Líquido" value="R$ 1.210" delta="+8.5%" icon={Wallet} positive highlight />
        
        <div className="bg-surface-container border border-outline rounded-3xl p-6 shadow-sm flex flex-col justify-between group hover:border-primary transition-all cursor-pointer">
           <div className="flex justify-between items-start">
              <div className="p-3 bg-primary-container text-primary rounded-xl">
                 <Plus className="w-6 h-6" />
              </div>
              <ChevronRight className="w-5 h-5 text-on-surface-variant transition-transform group-hover:translate-x-1" />
           </div>
           <div>
              <p className="text-sm font-bold text-on-surface">Registrar Aposta</p>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Atualize seu saldo</p>
           </div>
        </div>
      </section>

      {/* Alert Section */}
      <section className="bg-primary/5 border border-primary/10 rounded-3xl p-6 flex items-center gap-6">
         <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm border border-outline">
            <AlertCircle className="w-6 h-6" />
         </div>
         <div className="flex-1">
            <div className="text-sm font-bold text-on-surface">Saldo em crescimento constante.</div>
            <p className="text-xs text-on-surface-variant mt-1 font-medium">Sua estratégia atual resultou em um ROI de 18% nos últimos 30 dias. <span className="text-primary font-bold cursor-pointer hover:underline">Ver detalhes</span></p>
         </div>
      </section>

      {/* Performance Chart */}
      <section className="bg-surface-container border border-outline rounded-3xl p-8 shadow-sm">
        <div className="flex justify-between items-center mb-10">
           <div>
              <h3 className="text-xl font-bold">Evolução do Patrimônio</h3>
              <p className="text-sm text-on-surface-variant font-medium">Histórico de ganhos vs. investimentos nos últimos 30 dias</p>
           </div>
           <div className="flex bg-surface-dim p-1.5 rounded-xl border border-outline/50 gap-2">
              <span className="px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Lucro: R$ 850</span>
           </div>
        </div>

        <div className="h-80 w-full mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historyData}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis 
                dataKey="day" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 10, fontWeight: 700, fill: '#64748B'}} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 10, fontWeight: 700, fill: '#64748B'}}
                tickFormatter={(value) => `R$ ${value}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#FFFFFF', 
                  borderRadius: '16px', 
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px',
                  fontWeight: 700
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

      {/* Transaction History */}
      <section className="bg-surface-container border border-outline rounded-3xl overflow-hidden shadow-sm">
         <div className="px-8 py-6 border-b border-outline/50 flex justify-between items-center">
            <h3 className="font-bold">Últimas Movimentações</h3>
            <button className="text-xs font-bold text-primary hover:underline uppercase tracking-widest">Exportar PDF</button>
         </div>
         <div className="divide-y divide-outline/30">
            <TransactionRow date="12/04/2026" label="Mega-Sena Concurso 2.850" amount="- R$ 4,50" status="Investido" />
            <TransactionRow date="10/04/2026" label="Retirada para Conta Corrente" amount="- R$ 200,00" status="Saque" />
            <TransactionRow date="08/04/2026" label="Prêmio Quadra Concurso 2.848" amount="+ R$ 450,00" status="Prêmio" positive />
            <TransactionRow date="05/04/2026" label="Carga de Saldo via PIX" amount="+ R$ 100,00" status="Depósito" />
         </div>
      </section>
    </div>
  );
}

function FinanceCard({ label, value, delta, icon: Icon, positive, highlight }: any) {
  return (
    <div className={cn(
      "bg-surface-container border border-outline p-6 rounded-3xl shadow-sm transition-all hover:translate-y-[-4px]",
      highlight && "ring-2 ring-primary/20"
    )}>
       <div className="flex justify-between items-start mb-4">
          <div className={cn(
             "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm",
             positive ? "bg-primary-container text-primary" : "bg-surface-dim text-on-surface-variant"
          )}>
             <Icon className="w-5 h-5" />
          </div>
          <span className={cn(
             "text-[9px] font-bold px-2 py-0.5 rounded-full border shadow-sm",
             positive ? "bg-primary/5 text-primary border-primary/20" : "bg-on-surface-variant/5 text-on-surface-variant border-outline"
          )}>
            {delta}
          </span>
       </div>
       <p className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest mb-1">{label}</p>
       <p className="text-2xl font-bold font-inter text-on-surface">{value}</p>
    </div>
  );
}

function TransactionRow({ date, label, amount, status, positive }: any) {
  return (
    <div className="px-8 py-5 flex items-center justify-between hover:bg-surface-dim transition-all group cursor-pointer">
       <div className="flex items-center gap-4">
          <div className="text-[10px] font-bold text-on-surface-variant/40 group-hover:text-primary transition-colors">{date}</div>
          <div>
             <div className="text-sm font-bold text-on-surface">{label}</div>
             <div className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">{status}</div>
          </div>
       </div>
       <div className={cn(
          "text-sm font-bold flex items-center gap-2",
          positive ? "text-primary" : "text-on-surface"
       )}>
          {amount}
          <ArrowUpRight className={cn("w-4 h-4 opacity-0 group-hover:opacity-100 transition-all", !positive && "rotate-90")} />
       </div>
    </div>
  );
}
