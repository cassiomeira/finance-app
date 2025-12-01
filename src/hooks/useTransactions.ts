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
      const { error } = await supabase
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
        });

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
    totalIncome,
    totalExpense,
    balance,
  };
}
