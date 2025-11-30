import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { TransactionList } from '@/components/transactions/TransactionList';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { useTransactions } from '@/hooks/useTransactions';

export default function Transactions() {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const { transactions, deleteTransaction, isLoading } = useTransactions();

  const filteredTransactions = transactions.filter(t =>
    t.description?.toLowerCase().includes(search.toLowerCase()) ||
    t.category?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold">Lançamentos</h1>
            <p className="text-muted-foreground">Gerencie suas receitas e despesas</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-finance-primary">
            <Plus size={20} />
            Novo Lançamento
          </button>
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
