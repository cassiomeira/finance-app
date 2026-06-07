import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Profile, SubscriptionStatus } from '@/types/finance';

export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const data = await api.profiles.get();
      return {
        ...data,
        subscription_status: data.subscription_status as SubscriptionStatus
      } as Profile;
    },
    enabled: !!user?.id,
  });

  const { data: isAdmin } = useQuery({
    queryKey: ['is-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const data = await api.profiles.isAdmin();
      return data.is_admin === true;
    },
    enabled: !!user?.id,
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user?.id) throw new Error('No user');
      await api.profiles.update(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

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
