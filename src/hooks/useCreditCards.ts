import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
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
      if (!user?.id) return [];
      const data = await api.creditCards.getAll();
      return (data || []) as (CreditCard & { used_limit: number })[];
    },
    enabled: !!user?.id,
  });

  const createCard = useMutation({
    mutationFn: async (input: CreateCardInput) => {
      if (!user?.id) throw new Error('No user');
      await api.creditCards.create(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
      toast.success('Cartão adicionado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao adicionar cartão: ' + error.message);
    },
  });

  const deleteCard = useMutation({
    mutationFn: async (id: string) => {
      await api.creditCards.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Cartão e dados vinculados removidos!');
    },
    onError: (error: Error) => {
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
      const data = await api.creditCards.getInvoices(cardId);
      return (data || []) as CardInvoice[];
    },
    enabled: !!cardId,
  });

  return { invoices, isLoading };
}
