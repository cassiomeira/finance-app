import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { Transaction } from '@/types/finance';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete?: (id: string) => void;
  showDelete?: boolean;
}

export function TransactionList({ transactions, onDelete, showDelete = false }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhuma transação encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction, index) => (
        <motion.div
          key={transaction.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border/50 hover:shadow-md transition-all duration-200 group"
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${transaction.category?.color}20` }}
          >
            <CategoryIcon
              name={transaction.category?.icon || 'Circle'}
              color={transaction.category?.color}
              size={24}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {transaction.description || transaction.category?.name || 'Sem descrição'}
            </p>
            <p className="text-sm text-muted-foreground">
              {transaction.category?.name} • {format(new Date(transaction.date), "dd 'de' MMM", { locale: ptBR })}
            </p>
          </div>
          <div className="text-right">
            <p
              className={cn(
                "font-semibold",
                transaction.type === 'income' ? 'text-success' : 'text-destructive'
              )}
            >
              {transaction.type === 'income' ? '+' : '-'} R${' '}
              {Number(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                transaction.type === 'income'
                  ? 'bg-success/10 text-success'
                  : 'bg-destructive/10 text-destructive'
              )}
            >
              {transaction.type === 'income' ? 'Receita' : 'Despesa'}
            </span>
          </div>
          {showDelete && onDelete && (
            <button
              onClick={() => onDelete(transaction.id)}
              className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive transition-all"
            >
              <Trash2 size={18} />
            </button>
          )}
        </motion.div>
      ))}
    </div>
  );
}
