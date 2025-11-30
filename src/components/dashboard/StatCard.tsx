import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'income' | 'expense' | 'balance';
  delay?: number;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
  delay = 0,
}: StatCardProps) {
  const variants = {
    default: 'bg-card',
    income: 'bg-success/5 border-success/20',
    expense: 'bg-destructive/5 border-destructive/20',
    balance: 'gradient-primary text-primary-foreground',
  };

  const iconBg = {
    default: 'bg-muted',
    income: 'bg-success/10',
    expense: 'bg-destructive/10',
    balance: 'bg-primary-foreground/20',
  };

  const iconColor = {
    default: 'text-foreground',
    income: 'text-success',
    expense: 'text-destructive',
    balance: 'text-primary-foreground',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={cn(
        "p-5 rounded-2xl border border-border/50 shadow-card",
        variants[variant]
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-3 rounded-xl", iconBg[variant])}>
          <div className={iconColor[variant]}>{icon}</div>
        </div>
        {trend && (
          <div
            className={cn(
              "px-2 py-1 rounded-full text-xs font-medium",
              trend.isPositive
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive"
            )}
          >
            {trend.isPositive ? '+' : ''}{trend.value}%
          </div>
        )}
      </div>
      <p className={cn(
        "text-sm mb-1",
        variant === 'balance' ? 'text-primary-foreground/80' : 'text-muted-foreground'
      )}>
        {title}
      </p>
      <p className="text-2xl font-display font-bold">{value}</p>
      {subtitle && (
        <p className={cn(
          "text-xs mt-1",
          variant === 'balance' ? 'text-primary-foreground/70' : 'text-muted-foreground'
        )}>
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
