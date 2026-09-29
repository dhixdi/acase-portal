import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface MyStatus {
  has_team: boolean;
  server_now: string;
  team?: {
    id: string;
    code: string;
    name: string;
    team_size: number;
    category: string;
    is_active: boolean;
    payment_verified: boolean;
    biodata_completed: boolean;
    consent_given: boolean;
    student_proof_path: string | null;
  };
  is_finalist: boolean;
  biodata_editable: boolean;
  can_access_case: boolean;
  can_submit_case: boolean;
  can_submit_pitch: boolean;
  stages: Record<string, {
    label: string;
    opens_at: string;
    closes_at: string | null;
    is_open: boolean;
  }>;
}

export function useMyStatus(enabled: boolean = true) {
  return useQuery({
    queryKey: ['myStatus'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_status');
      if (error) throw error;
      return data as MyStatus;
    },
    enabled,
  });
}
