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
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', user?.id)
        .order('name');
      
      if (error) throw error;
      return (data || []) as CreditCard[];
    },
    enabled: !!user?.id,
  });

  const createCard = useMutation({
    mutationFn: async (input: CreateCardInput) => {
      if (!user?.id) throw new Error('No user');
      
      const { error } = await supabase
        .from('credit_cards')
        .insert({
          ...input,
          user_id: user.id,
        });
      
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
      const { error } = await supabase
        .from('credit_cards')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
      toast.success('Cartão removido!');
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
