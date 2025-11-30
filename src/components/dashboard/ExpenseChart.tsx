import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';

interface ExpenseChartProps {
  data: { category: string; amount: number; color: string }[];
}

export function ExpenseChart({ data }: ExpenseChartProps) {
  const total = data.reduce((sum, item) => sum + item.amount, 0);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        Nenhuma despesa registrada
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="h-64"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="amount"
            animationBegin={0}
            animationDuration={800}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                const percentage = ((item.amount / total) * 100).toFixed(1);
                return (
                  <div className="bg-card p-3 rounded-lg shadow-lg border border-border">
                    <p className="font-medium">{item.category}</p>
                    <p className="text-sm text-muted-foreground">
                      R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">{percentage}%</p>
                  </div>
                );
              }
              return null;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-2 mt-4">
        {data.slice(0, 4).map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-muted-foreground truncate">
              {item.category}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
