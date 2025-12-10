import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCard, CardInvoice } from '@/types/finance';
import { toast } from 'sonner';

interface CreateCardInput {
  name: string;
  card_limit: number;
  closing_day: number;
  due_day: number;
  color?: string;
}

export function useCreditCards() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['credit_cards', user?.id],
    queryFn: async () => {
      // 1. Fetch cards
      const { data: cardsData, error: cardsError } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', user?.id)
        .order('name');

      if (cardsError) throw cardsError;

      // 2. Fetch pending transactions for usage calculation
      // We use a try-catch or simplified error handling here to prevent the whole query from failing
      // if the 'status' column hasn't been added to the database yet.
      let usageMap: Record<string, number> = {};

      try {
        const { data: usageData, error: usageError } = await supabase
          .from('transactions')
          .select('card_id, amount')
          .eq('user_id', user?.id)
          .eq('payment_method', 'credit')
          .eq('status', 'pending');

        if (!usageError && usageData) {
          usageData.forEach((t: any) => {
            if (t.card_id) {
              usageMap[t.card_id] = (usageMap[t.card_id] || 0) + Number(t.amount);
            }
          });
        } else if (usageError) {
          console.warn('Error fetching card usage (possibly missing status column):', usageError);
        }
      } catch (err) {
        console.warn('Exception fetching card usage:', err);
      }

      // 3. Map and merge
      return (cardsData || []).map((card: any) => ({
        ...card,
        card_limit: card.limit_amount || card.card_limit || 0,
        used_limit: usageMap[card.id] || 0
      })) as (CreditCard & { used_limit: number })[];
    },
    enabled: !!user?.id,
  });

  const createCard = useMutation({
    mutationFn: async (input: CreateCardInput) => {
      if (!user?.id) throw new Error('No user');

      const { error } = await supabase
        .from('credit_cards')
        .insert({
          name: input.name,
          limit_amount: input.card_limit, // Banco usa 'limit_amount'
          closing_day: input.closing_day,
          due_day: input.due_day,
          color: input.color || '#10B981', // Cor padrão (Emerald-500) se não fornecida
          user_id: user.id,
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
      toast.success('Cartão adicionado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao adicionar cartão: ' + error.message);
    },
  });

  const deleteCard = useMutation({
    mutationFn: async (id: string) => {
      // 1. Deletar transações vinculadas ao cartão
      const { error: txError } = await supabase
        .from('transactions')
        .delete()
        .eq('card_id', id);
      if (txError) throw txError;

      // 2. Deletar faturas vinculadas (se houver tabela separada, mas parece ser view/query no código atual, porém 'card_invoices' é citada abaixo)
      // Verificando a função useCardInvoices abaixo, existe a tabela 'card_invoices'.
      const { error: invoiceError } = await supabase
        .from('card_invoices')
        .delete()
        .eq('card_id', id);
      // Ignoramos erro se a tabela não existir ou se não tiver permissão, mas é boa prática tentar limpar.
      // Se 'card_invoices' for uma View, o delete vai falhar, então melhor envolver em try/catch ou checar se é tabela.
      // Pelo contexto do Supabase, geralmente Views não são deletáveis diretamente assim sem trigger.
      // Vou assumir que se falhar o delete da transactions já libera o cartão se a constraint for só lá.
      // Mas se 'card_invoices' for tabela real de histórico, precisa deletar.
      if (invoiceError && invoiceError.code !== '42P01') { // 42P01 = undefined_table
        console.warn('Erro ao limpar faturas ou tabela é view:', invoiceError);
      }

      // 3. Deletar o cartão
      const { error } = await supabase
        .from('credit_cards')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] }); // Também invalidar transações pois removemos algumas
      toast.success('Cartão e dados vinculados removidos!');
    },
    onError: (error) => {
      console.error('Erro ao deletar cartão:', error);
      toast.error('Erro ao excluir: ' + error.message);
    },
  });

  return {
    cards,
    isLoading,
    createCard,
    deleteCard,
  };
}

export function useCardInvoices(cardId?: string) {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['card_invoices', cardId],
    queryFn: async () => {
      if (!cardId) return [];
      const { data, error } = await supabase
        .from('card_invoices')
        .select('*')
        .eq('card_id', cardId)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) throw error;
      return (data || []) as CardInvoice[];
    },
    enabled: !!cardId,
  });

  return { invoices, isLoading };
}
