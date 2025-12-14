import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Category, TransactionType } from '@/types/finance';
import { toast } from 'sonner';

export function useCategories() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .or(`is_default.eq.true,user_id.eq.${user?.id}`)
        .order('name');

      if (error) throw error;
      return (data || []).map(cat => ({
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
      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: category.name,
          icon: category.icon,
          color: category.color,
          type: category.type,
          user_id: user.id,
          is_default: false
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria criada!');
    },
    onError: (err) => {
      toast.error('Erro ao criar: ' + err.message);
    }
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Category> & { id: string }) => {
      const { error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria atualizada!');
    },
    onError: (err) => {
      toast.error('Erro ao atualizar: ' + err.message);
    }
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria removida!');
    },
    onError: (err) => {
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
