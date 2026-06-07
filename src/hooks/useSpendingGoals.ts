import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { SpendingGoal } from '@/types/finance';
import { toast } from 'sonner';

export function useSpendingGoals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['spending_goals', user?.id, currentMonth, currentYear],
    queryFn: async () => {
      if (!user?.id) return [];
      const data = await api.budgets.getAll(currentMonth, currentYear);

      // Mapeia Budget -> SpendingGoal para manter compatibilidade com a UI
      return (data || []).map((b: any) => ({
        id: b.id,
        user_id: b.user_id,
        category_id: b.category_id,
        amount: b.amount,
        month: b.month,
        year: b.year,
        is_global: !b.category_id,
        created_at: b.created_at,
        category: b.category
      })) as SpendingGoal[];
    },
    enabled: !!user?.id,
  });

  const createGoal = useMutation({
    mutationFn: async (input: Partial<SpendingGoal>) => {
      if (!user?.id) throw new Error('No user');
      await api.budgets.save({
        category_id: input.category_id || null,
        amount: input.amount,
        month: input.month || currentMonth,
        year: input.year || currentYear
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spending_goals'] });
      toast.success('Meta salva com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar meta: ' + error.message);
    },
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      await api.budgets.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spending_goals'] });
      toast.success('Meta excluída!');
    },
  });

  return {
    goals,
    isLoading,
    createGoal,
    deleteGoal,
  };
}
