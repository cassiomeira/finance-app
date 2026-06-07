import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Budget } from '@/types/finance';
import { toast } from 'sonner';

export function useBudgets(month: number, year: number) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['budgets', user?.id, month, year],
    queryFn: async () => {
      if (!user?.id) return [];
      const data = await api.budgets.getAll(month, year);
      return (data || []) as Budget[];
    },
    enabled: !!user?.id,
  });

  const saveBudget = useMutation({
    mutationFn: async (input: { category_id: string; amount: number }) => {
      if (!user?.id) throw new Error('No user');
      await api.budgets.save({ ...input, month, year });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Meta atualizada!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar meta: ' + error.message);
    }
  });

  return {
    budgets,
    isLoading,
    saveBudget
  };
}
