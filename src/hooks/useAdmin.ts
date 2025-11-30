import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useAdmin() {
  const { user } = useAuth();

  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase
        .rpc('is_admin', { _user_id: user.id });
      
      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }
      
      return data === true;
    },
    enabled: !!user?.id,
  });

  return {
    isAdmin: isAdmin ?? false,
    isLoading,
  };
}
