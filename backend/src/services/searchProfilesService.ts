import { supabase } from '../lib/supabase.js';
import { env } from '../lib/env.js';

export async function getSearchProfiles() {
  const { data, error } = await supabase
    .from('search_profiles')
    .select('*')
    .eq('owner_id', env.DEFAULT_USER_ID)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
