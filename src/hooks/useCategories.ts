import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Category, TransactionType } from '@/types/finance';
import { toast } from 'sonner';

export function useCategories() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const data = await api.categories.getAll();
      return (data || []).map((cat: any) => ({
        ...cat,
        type: cat.type as TransactionType
      })) as Category[];
    },
    enabled: !!user?.id,
  });

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const createCategory = useMutation({
    mutationFn: async (category: Partial<Category>) => {
      if (!user?.id) throw new Error('No user');
      return await api.categories.create(category);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria criada!');
    },
    onError: (err: Error) => {
      toast.error('Erro ao criar: ' + err.message);
    }
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Category> & { id: string }) => {
      await api.categories.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria atualizada!');
    },
    onError: (err: Error) => {
      toast.error('Erro ao atualizar: ' + err.message);
    }
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      await api.categories.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria removida!');
    },
    onError: (err: Error) => {
      toast.error('Erro ao deletar (Pode estar em uso): ' + err.message);
    }
  });

  return {
    categories,
    incomeCategories,
    expenseCategories,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory
  };
}
