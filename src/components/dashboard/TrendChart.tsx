import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';

interface TrendChartProps {
  data: { month: string; income: number; expense: number }[];
}

export function TrendChart({ data }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        Dados insuficientes para exibir tendência
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="h-64"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-card p-3 rounded-lg shadow-lg border border-border">
                    <p className="font-medium mb-2">{label}</p>
                    {payload.map((item, index) => (
                      <p key={index} className="text-sm" style={{ color: item.color }}>
                        {item.name === 'income' ? 'Receitas' : 'Despesas'}:{' '}
                        R$ {Number(item.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    ))}
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="income"
            stroke="hsl(160, 84%, 39%)"
            strokeWidth={2}
            fill="url(#incomeGradient)"
            animationDuration={1000}
          />
          <Area
            type="monotone"
            dataKey="expense"
            stroke="hsl(0, 72%, 51%)"
            strokeWidth={2}
            fill="url(#expenseGradient)"
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-success" />
          <span className="text-sm text-muted-foreground">Receitas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive" />
          <span className="text-sm text-muted-foreground">Despesas</span>
        </div>
      </div>
    </motion.div>
  );
}
