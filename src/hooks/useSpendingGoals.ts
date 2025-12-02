import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SpendingGoal, Budget } from '@/types/finance';
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
            // Usamos a tabela 'budgets' mas mapeamos para o tipo SpendingGoal que a UI espera
            const { data, error } = await (supabase
                .from('budgets' as any) as any)
                .select(`
          *,
          category:categories(*)
        `)
                .eq('user_id', user?.id)
                .eq('month', currentMonth)
                .eq('year', currentYear);

            if (error) throw error;

            // Mapear Budget -> SpendingGoal
            return (data as Budget[]).map(b => ({
                id: b.id,
                user_id: b.user_id,
                category_id: b.category_id,
                amount: b.amount,
                month: b.month,
                year: b.year,
                is_global: false, // Budgets são por categoria
                created_at: b.created_at,
                category: b.category
            })) as SpendingGoal[];
        },
        enabled: !!user?.id,
    });

    const createGoal = useMutation({
        mutationFn: async (input: Partial<SpendingGoal>) => {
            if (!user?.id) throw new Error('No user');

            // Verificar se já existe meta para essa categoria (ou meta geral) neste mês
            const existing = goals.find(g =>
                input.category_id ? g.category_id === input.category_id : !g.category_id
            );

            if (existing) {
                // Atualizar
                const { error } = await (supabase
                    .from('budgets' as any) as any)
                    .update({ amount: input.amount })
                    .eq('id', existing.id);
                if (error) throw error;
            } else {
                // Criar
                const { error } = await (supabase
                    .from('budgets' as any) as any)
                    .insert({
                        user_id: user.id,
                        category_id: input.category_id || null, // Null for general goal
                        amount: input.amount,
                        month: input.month || currentMonth,
                        year: input.year || currentYear
                    });
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spending_goals'] });
            toast.success('Meta salva com sucesso!');
        },
        onError: (error) => {
            if (error.message.includes('category_id') && error.message.includes('not-null constraint')) {
                toast.error('⚠️ ATENÇÃO: Você precisa rodar o comando SQL para permitir metas gerais!');
            } else {
                toast.error('Erro ao salvar meta: ' + error.message);
            }
        },
    });

    const deleteGoal = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase
                .from('budgets' as any) as any)
                .delete()
                .eq('id', id);
            if (error) throw error;
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
