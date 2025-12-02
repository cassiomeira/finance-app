import { motion } from 'framer-motion';
import { Trash2, Edit, MoreVertical, CheckCircle2, Clock } from 'lucide-react';
import { Transaction } from '@/types/finance';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useTransactions } from '@/hooks/useTransactions';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete?: (id: string) => void;
  onEdit?: (transaction: Transaction) => void;
  showDelete?: boolean;
}

export function TransactionList({ transactions, onDelete, onEdit, showDelete = false }: TransactionListProps) {
  const { toggleTransactionStatus } = useTransactions();

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
            className="w-12 h-12 rounded-xl flex items-center justify-center relative"
            style={{ backgroundColor: `${transaction.category?.color}20` }}
          >
            <CategoryIcon
              name={transaction.category?.icon || 'Circle'}
              color={transaction.category?.color}
              size={24}
            />
            {/* Status Indicator Badge */}
            <div className={cn(
              "absolute -bottom-1 -right-1 rounded-full p-0.5 border-2 border-card",
              transaction.status === 'paid' ? "bg-green-500 text-white" : "bg-yellow-500 text-white"
            )}>
              {transaction.status === 'paid' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {transaction.description || transaction.category?.name || 'Sem descrição'}
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              {transaction.category?.name} • {format(new Date(transaction.date), "dd 'de' MMM", { locale: ptBR })}
              {transaction.status === 'pending' && (
                <span className="text-yellow-600 text-[10px] bg-yellow-100 px-1.5 py-0.5 rounded-full font-medium">
                  A Pagar
                </span>
              )}
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

          {(showDelete || onEdit) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="sr-only">Abrir menu</span>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => toggleTransactionStatus.mutate({
                  id: transaction.id,
                  status: transaction.status === 'paid' ? 'pending' : 'paid'
                })}>
                  {transaction.status === 'paid' ? (
                    <>
                      <Clock className="mr-2 h-4 w-4" />
                      Marcar como A Pagar
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Marcar como Pago
                    </>
                  )}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(transaction)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(transaction.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </motion.div>
      ))}
    </div>
  );
}
