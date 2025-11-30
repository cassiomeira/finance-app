import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Category, TransactionType } from '@/types/finance';

export function useCategories() {
  const { user } = useAuth();

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

  return {
    categories,
    incomeCategories,
    expenseCategories,
    isLoading,
  };
}
