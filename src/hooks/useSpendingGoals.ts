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

            // Se for global, ignoramos por enquanto ou tratamos de outra forma, 
            // pois a tabela budgets exige category_id.
            // Vamos focar em metas por categoria.
            if (!input.category_id) {
                throw new Error("Meta global não suportada nesta versão. Selecione uma categoria.");
            }

            // Verificar se já existe meta para essa categoria neste mês
            const existing = goals.find(g => g.category_id === input.category_id);

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
                        category_id: input.category_id,
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
            toast.error('Erro ao salvar meta: ' + error.message);
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
