import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useIsAdmin(enabled: boolean = true) {
  return useQuery({
    queryKey: ['isAdmin'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_admin');
      if (error) throw error;
      return data as boolean;
    },
    enabled,
    staleTime: 60 * 1000,
  });
}
