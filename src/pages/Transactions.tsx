import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { TransactionList } from '@/components/transactions/TransactionList';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { useTransactions } from '@/hooks/useTransactions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Transactions() {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const month = selectedMonth.getMonth() + 1;
  const year = selectedMonth.getFullYear();

  const { transactions, deleteTransaction, isLoading } = useTransactions(month, year);

  const filteredTransactions = transactions.filter(t =>
    t.description?.toLowerCase().includes(search.toLowerCase()) ||
    t.category?.name.toLowerCase().includes(search.toLowerCase())
  );

  const navigateMonth = (direction: 'prev' | 'next') => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold">Lançamentos</h1>
            <p className="text-muted-foreground">Gerencie suas receitas e despesas</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-card rounded-xl p-2 border border-border">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="font-medium min-w-[120px] text-center capitalize">
                {format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}
              </span>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <button onClick={() => setShowForm(true)} className="btn-finance-primary">
              <Plus size={20} />
              <span className="hidden sm:inline">Novo Lançamento</span>
            </button>
          </div>
        </div>

        <div className="relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar lançamentos..."
            className="input-finance pl-12"
          />
        </div>

        <div className="card-finance">
          <TransactionList
            transactions={filteredTransactions}
            onDelete={(id) => deleteTransaction.mutate(id)}
            showDelete
          />
        </div>
      </div>

      <AnimatePresence>
        {showForm && <TransactionForm onClose={() => setShowForm(false)} />}
      </AnimatePresence>
    </AppLayout>
  );
}
