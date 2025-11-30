import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Transaction, TransactionType, PaymentMethod } from '@/types/finance';
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
  recurring_frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
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
      
      const { error } = await supabase
        .from('transactions')
        .insert({
          ...input,
          user_id: user.id,
        });
      
      if (error) throw error;
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
