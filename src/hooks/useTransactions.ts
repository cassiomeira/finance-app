import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Transaction, TransactionType, PaymentMethod, Frequency } from '@/types/finance';
import { toast } from 'sonner';

interface CreateTransactionInput {
  type: TransactionType;
  category_id: string;
  amount: number;
  description?: string;
  date: string;
  payment_method: PaymentMethod;
  card_id?: string;
  is_recurring?: boolean;
  recurring_frequency?: Frequency;
  recurring_end_date?: string;
  status?: 'paid' | 'pending';
}

export function useTransactions(month?: number, year?: number) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const currentDate = new Date();
  const targetMonth = month ?? currentDate.getMonth() + 1;
  const targetYear = year ?? currentDate.getFullYear();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', user?.id, targetMonth, targetYear],
    queryFn: async () => {
      if (!user?.id) return [];
      const data = await api.transactions.getAll(targetMonth, targetYear);
      return (data || []).map((t: any) => ({
        ...t,
        type: t.type as TransactionType,
        payment_method: t.payment_method as PaymentMethod,
        status: t.status as 'paid' | 'pending',
        category: t.category && t.category.id ? {
          ...t.category,
          type: t.category.type as TransactionType
        } : undefined
      })) as Transaction[];
    },
    enabled: !!user?.id,
  });

  const createTransaction = useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      if (!user?.id) throw new Error('No user');
      return await api.transactions.create(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Lançamento criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar lançamento: ' + error.message);
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      await api.transactions.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Lançamento excluído!');
    },
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreateTransactionInput> & { id: string }) => {
      await api.transactions.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Lançamento atualizado!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar lançamento: ' + error.message);
    },
  });

  const toggleTransactionStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'paid' | 'pending' }) => {
      await api.transactions.updateStatus(id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Status atualizado!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar status: ' + error.message);
    },
  });

  const payInvoice = useMutation({
    mutationFn: async (cardId: string) => {
      await api.transactions.payInvoice(cardId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
      toast.success('Fatura paga com sucesso! Todas as despesas foram quitadas.');
    },
    onError: (error: Error) => {
      toast.error('Erro ao pagar fatura: ' + error.message);
    },
  });

  const clearMonthTransactions = useMutation({
    mutationFn: async ({ month, year }: { month: number; year: number }) => {
      await api.transactions.deleteMonth(month, year);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
      toast.success('Lançamentos do mês removidos com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao limpar mês: ' + error.message);
    },
  });

  const clearAllTransactions = useMutation({
    mutationFn: async () => {
      await api.transactions.deleteAll();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
      toast.success('Todos os lançamentos foram removidos!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao limpar tudo: ' + error.message);
    },
  });

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const balance = totalIncome - totalExpense;

  return {
    transactions,
    isLoading,
    createTransaction,
    deleteTransaction,
    updateTransaction,
    toggleTransactionStatus,
    payInvoice,
    clearMonthTransactions,
    clearAllTransactions,
    totalIncome,
    totalExpense,
    balance,
  };
}
