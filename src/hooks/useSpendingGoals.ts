import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SpendingGoal, TransactionType } from '@/types/finance';
import { toast } from 'sonner';

interface CreateGoalInput {
  category_id?: string;
  amount: number;
  month: number;
  year: number;
  is_global?: boolean;
}

export function useSpendingGoals(month?: number, year?: number) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const currentDate = new Date();
  const targetMonth = month ?? currentDate.getMonth() + 1;
  const targetYear = year ?? currentDate.getFullYear();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['spending_goals', user?.id, targetMonth, targetYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spending_goals')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('user_id', user?.id)
        .eq('month', targetMonth)
        .eq('year', targetYear);
      
      if (error) throw error;
      return (data || []).map(g => ({
        ...g,
        category: g.category ? {
          ...g.category,
          type: g.category.type as TransactionType
        } : undefined
      })) as SpendingGoal[];
    },
    enabled: !!user?.id,
  });

  const createGoal = useMutation({
    mutationFn: async (input: CreateGoalInput) => {
      if (!user?.id) throw new Error('No user');
      
      const { error } = await supabase
        .from('spending_goals')
        .insert({
          ...input,
          user_id: user.id,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spending_goals'] });
      toast.success('Meta criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar meta: ' + error.message);
    },
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('spending_goals')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spending_goals'] });
      toast.success('Meta removida!');
    },
  });

  const globalGoal = goals.find(g => g.is_global);
  const categoryGoals = goals.filter(g => !g.is_global);

  return {
    goals,
    globalGoal,
    categoryGoals,
    isLoading,
    createGoal,
    deleteGoal,
  };
}
