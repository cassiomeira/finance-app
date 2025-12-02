import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Plus,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { ExpenseChart } from '@/components/dashboard/ExpenseChart';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { TransactionList } from '@/components/transactions/TransactionList';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { MagicInput } from '@/components/transactions/MagicInput';
import { FinancialAdvisor } from '@/components/dashboard/FinancialAdvisor';
import { useTransactions } from '@/hooks/useTransactions';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useSpendingGoals } from '@/hooks/useSpendingGoals';
import { useProfile } from '@/hooks/useProfile';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Transaction } from '@/types/finance';

export default function Dashboard() {
  const [showForm, setShowForm] = useState(false);
  const [initialFormData, setInitialFormData] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const month = selectedMonth.getMonth() + 1;
  const year = selectedMonth.getFullYear();

  const { transactions, totalIncome, totalExpense, balance, isLoading, deleteTransaction } = useTransactions(month, year);
  const { cards } = useCreditCards();
  const { goals } = useSpendingGoals();
  // Find global goal or sum of category goals for demo
  const globalGoal = goals.find(g => g.is_global) || { amount: goals.reduce((acc, g) => acc + Number(g.amount), 0) };
  const { isPremium } = useProfile();

  // Calculate expenses by category
  const expensesByCategory = useMemo(() => {
    const categoryMap = new Map<string, { amount: number; color: string; icon: string }>();

    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const catName = t.category?.name || 'Outros';
        const current = categoryMap.get(catName) || { amount: 0, color: t.category?.color || '#64748b', icon: t.category?.icon || 'Circle' };
        categoryMap.set(catName, {
          ...current,
          amount: current.amount + Number(t.amount),
        });
      });

    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  // Calculate monthly trend (last 6 months)
  const monthlyTrend = useMemo(() => {
    const months: { month: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(selectedMonth, i);
      const monthName = format(date, 'MMM', { locale: ptBR });
      months.push({ month: monthName, income: 0, expense: 0 });
    }
    // For demo purposes - would need actual historical data
    months[5] = { month: months[5].month, income: totalIncome, expense: totalExpense };
    return months;
  }, [selectedMonth, totalIncome, totalExpense]);

  // Check if over budget
  const isOverBudget = globalGoal && totalExpense > Number(globalGoal.amount);
  const budgetPercentage = globalGoal
    ? Math.min((totalExpense / Number(globalGoal.amount)) * 100, 100)
    : 0;

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

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

  const handleMagicTransaction = (data: any) => {
    setInitialFormData(data);
    setShowForm(true);
  };

  const handleOpenNewTransaction = () => {
    setInitialFormData(null);
    setShowForm(true);
  };

  const handleEdit = (transaction: Transaction) => {
    setInitialFormData({
      id: transaction.id,
      amount: Number(transaction.amount),
      description: transaction.description || '',
      date: transaction.date,
      category_id: transaction.category_id || '',
      type: transaction.type,
      payment_method: transaction.payment_method,
      card_id: transaction.card_id || ''
    });
    setShowForm(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-display font-bold">Dashboard</h1>
              <p className="text-muted-foreground">Visão geral das suas finanças</p>
            </div>

            {/* Desktop Controls */}
            <div className="hidden lg:flex items-center gap-4">
              <div className="flex items-center gap-2 bg-card rounded-xl p-2 border border-border">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="font-medium min-w-[120px] text-center">
                  {format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                </span>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <FinancialAdvisor />
              <MagicInput onTransactionGenerated={handleMagicTransaction} />

              <button
                onClick={handleOpenNewTransaction}
                className="btn-finance-primary"
              >
                <Plus size={20} />
                <span>Novo Lançamento</span>
              </button>
            </div>
          </div>

          {/* Mobile Controls */}
          <div className="flex flex-col gap-3 lg:hidden">
            {/* Month Navigator Mobile */}
            <div className="flex items-center justify-between bg-card rounded-xl p-2 border border-border w-full">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="font-medium text-center capitalize">
                {format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}
              </span>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Action Buttons Grid */}
            <div className="grid grid-cols-3 gap-2">
              <FinancialAdvisor />
              <MagicInput onTransactionGenerated={handleMagicTransaction} />
              <button
                onClick={handleOpenNewTransaction}
                className="btn-finance-primary justify-center px-0"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Budget Alert */}
        {isOverBudget && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive"
          >
            <AlertTriangle size={20} />
            <div>
              <p className="font-medium">Limite de gastos excedido!</p>
              <p className="text-sm opacity-80">
                Você ultrapassou sua meta mensal de {formatCurrency(Number(globalGoal?.amount))}
              </p>
            </div>
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Saldo do Mês"
            value={formatCurrency(balance)}
            icon={<Wallet size={24} />}
            variant="balance"
            delay={0}
          />
          <StatCard
            title="Receitas"
            value={formatCurrency(totalIncome)}
            icon={<TrendingUp size={24} />}
            variant="income"
            delay={0.1}
          />
          <StatCard
            title="Despesas"
            value={formatCurrency(totalExpense)}
            icon={<TrendingDown size={24} />}
            variant="expense"
            delay={0.2}
          />
          <StatCard
            title="Cartões"
            value={`${cards.length} ${cards.length === 1 ? 'cartão' : 'cartões'}`}
            subtitle={isPremium ? 'Ilimitado' : 'Limite: 1 cartão'}
            icon={<CreditCard size={24} />}
            delay={0.3}
          />
        </div>

        {/* Budget Progress */}
        {globalGoal && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card-finance"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Meta de Gastos Mensal</h3>
              <span className={isOverBudget ? 'text-destructive' : 'text-muted-foreground'}>
                {formatCurrency(totalExpense)} / {formatCurrency(Number(globalGoal.amount))}
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${budgetPercentage}%` }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className={`h-full rounded-full ${budgetPercentage >= 100
                  ? 'bg-destructive'
                  : budgetPercentage >= 80
                    ? 'bg-warning'
                    : 'gradient-primary'
                  }`}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {budgetPercentage.toFixed(0)}% do orçamento utilizado
            </p>
          </motion.div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="card-finance"
          >
            <h3 className="font-display font-semibold text-lg mb-4">Despesas por Categoria</h3>
            <ExpenseChart data={expensesByCategory} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="card-finance"
          >
            <h3 className="font-display font-semibold text-lg mb-4">Evolução Mensal</h3>
            <TrendChart data={monthlyTrend} />
          </motion.div>
        </div>

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="card-finance"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-lg">Últimas Transações</h3>
            <a href="/transactions" className="text-sm text-primary hover:underline">
              Ver todas
            </a>
          </div>
          <TransactionList
            transactions={transactions.slice(0, 5)}
            onDelete={(id) => deleteTransaction.mutate(id)}
            onEdit={handleEdit}
            showDelete
          />
        </motion.div>
      </div>

      {/* Transaction Form Modal */}
      <AnimatePresence>
        {showForm && <TransactionForm onClose={() => setShowForm(false)} initialData={initialFormData} />}
      </AnimatePresence>
    </AppLayout>
  );
}
