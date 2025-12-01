import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Budget } from '@/types/finance';
import { toast } from 'sonner';

export function useBudgets(month: number, year: number) {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: budgets = [], isLoading } = useQuery({
        queryKey: ['budgets', user?.id, month, year],
        queryFn: async () => {
            const { data, error } = await (supabase
                .from('budgets' as any) as any)
                .select(`
          *,
          category:categories(*)
        `)
                .eq('user_id', user?.id)
                .eq('month', month)
                .eq('year', year);

            if (error) throw error;
            return data as Budget[];
        },
        enabled: !!user?.id,
    });

    const saveBudget = useMutation({
        mutationFn: async (input: { category_id: string; amount: number }) => {
            if (!user?.id) throw new Error('No user');

            // Verificar se já existe
            const existing = budgets.find(b => b.category_id === input.category_id);

            if (existing) {
                const { error } = await (supabase
                    .from('budgets' as any) as any)
                    .update({ amount: input.amount })
                    .eq('id', existing.id);
                if (error) throw error;
            } else {
                const { error } = await (supabase
                    .from('budgets' as any) as any)
                    .insert({
                        user_id: user.id,
                        category_id: input.category_id,
                        amount: input.amount,
                        month,
                        year
                    });
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budgets'] });
            toast.success('Meta atualizada!');
        },
        onError: (error) => {
            toast.error('Erro ao salvar meta: ' + error.message);
        }
    });

    return {
        budgets,
        isLoading,
        saveBudget
    };
}
