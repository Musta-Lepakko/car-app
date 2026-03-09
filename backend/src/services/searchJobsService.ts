import { supabase } from '../lib/supabase.js';

export async function createSearchJob(profileId: string) {
  const { data, error } = await supabase
    .from('search_jobs')
    .insert({
      profile_id: profileId,
      status: 'running'
    })
    .select()
    .single();

  if (error) throw error;

  // Placeholder behavior for the skeleton.
  // In the real version this row would be updated by the fetch pipeline.
  await supabase
    .from('search_jobs')
    .update({
      status: 'complete',
      completed_at: new Date().toISOString(),
      source_summary: { skeleton: 'complete' }
    })
    .eq('id', data.id);

  return { jobId: data.id, status: 'running' };
}

export async function getSearchJob(jobId: string) {
  const { data, error } = await supabase
    .from('search_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error) throw error;
  return data;
}
