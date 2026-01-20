import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

  const startDate = new Date(targetYear, targetMonth - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0];

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', user?.id, targetMonth, targetYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('user_id', user?.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;

      return (data || []).map(t => ({
        ...t,
        type: t.type as TransactionType,
        payment_method: t.payment_method as PaymentMethod,
        status: t.status as 'paid' | 'pending', // Ensure status is typed
        category: t.category ? {
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

      // 1. Criar a transação normal (registro atual)
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          type: input.type,
          category_id: input.category_id,
          amount: input.amount,
          description: input.description,
          date: input.date,
          payment_method: input.payment_method,
          card_id: input.card_id,
          user_id: user.id,
          status: input.status || (input.payment_method === 'credit' ? 'pending' : 'paid') // Default logic
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Se for recorrente, criar na tabela de recorrência
      if (input.is_recurring && input.recurring_frequency) {
        // Usando any para evitar erro de tipagem enquanto não atualizamos os types do Supabase
        const { error: recurringError } = await (supabase
          .from('recurring_transactions' as any) as any)
          .insert({
            user_id: user.id,
            description: input.description || 'Sem descrição',
            amount: input.amount,
            type: input.type,
            category_id: input.category_id,
            payment_method: input.payment_method,
            frequency: input.recurring_frequency,
            start_date: input.date,
            end_date: input.recurring_end_date || null,
            active: true
          });

        if (recurringError) throw recurringError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Lançamento criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar lançamento: ' + error.message);
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Lançamento excluído!');
    },
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreateTransactionInput> & { id: string }) => {
      const { error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Lançamento atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar lançamento: ' + error.message);
    },
  });

  const toggleTransactionStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'paid' | 'pending' }) => {
      const { error } = await supabase
        .from('transactions')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Status atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar status: ' + error.message);
    },
  });

  const payInvoice = useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'paid' } as any)
        .eq('card_id', cardId)
        .eq('status', 'pending');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
      toast.success('Fatura paga com sucesso! Todas as despesas foram quitadas.');
    },
    onError: (error) => {
      toast.error('Erro ao pagar fatura: ' + error.message);
    },
  });

  const clearMonthTransactions = useMutation({
    mutationFn: async ({ month, year }: { month: number; year: number }) => {
      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user?.id)
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] }); // Update limits
      toast.success('Lançamentos do mês removidos com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao limpar mês: ' + error.message);
    },
  });

  const clearAllTransactions = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
      toast.success('Todos os lançamentos foram removidos!');
    },
    onError: (error) => {
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
