import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Profile, SubscriptionStatus } from '@/types/finance';

export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        return {
          ...data,
          subscription_status: data.subscription_status as SubscriptionStatus
        } as Profile;
      }
      return null;
    },
    enabled: !!user?.id,
  });

  const { data: isAdmin } = useQuery({
    queryKey: ['is-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase.rpc('is_admin', { _user_id: user.id });
      if (error) return false;
      return data === true;
    },
    enabled: !!user?.id,
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user?.id) throw new Error('No user');
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  // Admin has full access regardless of subscription
  const hasFullAccess = isAdmin === true;
  const isPremium = hasFullAccess || profile?.subscription_status === 'premium';
  const transactionLimit = isPremium ? Infinity : 50;
  const canAddTransaction = isPremium || (profile?.monthly_transaction_count ?? 0) < transactionLimit;
  const creditCardLimit = isPremium ? Infinity : 1;

  return {
    profile,
    isLoading,
    updateProfile,
    isPremium,
    isAdmin: hasFullAccess,
    transactionLimit,
    canAddTransaction,
    creditCardLimit,
  };
}
