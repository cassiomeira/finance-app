import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export function useAdmin() {
  const { user } = useAuth();

  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const data = await api.profiles.isAdmin();
      return data.is_admin === true;
    },
    enabled: !!user?.id,
  });

  return {
    isAdmin: isAdmin ?? false,
    isLoading,
  };
}
