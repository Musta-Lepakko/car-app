import { supabase } from '../lib/supabase.js';
import { env } from '../lib/env.js';

type SearchProfileRow = {
  id: string;
  owner_id: string;
  locations: string[] | null;
  budget_min: number;
  budget_max: number;
  year_min: number;
  mileage_max: number;
  fuel: string;
  preferred_brands: string[] | null;
  acceptable_brands: string[] | null;
  transmission_preference: string;
};

type SearchJobRow = {
  id: string;
  status: string;
  added_count: number;
  updated_count: number;
  failed_count: number;
  source_summary: Record<string, unknown> | null;
  completed_at: string | null;
  error_log: string | null;
};

function isFinalStatus(status: string) {
  return status === 'complete' || status === 'partial' || status === 'failed';
}

async function getOwnedProfile(profileId: string): Promise<SearchProfileRow> {
  const { data, error } = await supabase
    .from('search_profiles')
    .select('id, owner_id, locations, budget_min, budget_max, year_min, mileage_max, fuel, preferred_brands, acceptable_brands, transmission_preference')
    .eq('id', profileId)
    .eq('owner_id', env.DEFAULT_USER_ID)
    .single();

  if (error || !data) {
    throw new Error('Saved search profile not found.');
  }

  return data as SearchProfileRow;
}

async function setProfileRunState(profileId: string, status: string) {
  const payload: Record<string, unknown> = {
    last_run_status: status,
    last_run_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('search_profiles')
    .update(payload)
    .eq('id', profileId)
    .eq('owner_id', env.DEFAULT_USER_ID);

  if (error) throw error;
}

async function scanStoredListingsForProfile(profile: SearchProfileRow) {
  let db = supabase
    .from('listing_overview')
    .select('listing_id', { count: 'exact', head: true })
    .eq('user_id', env.DEFAULT_USER_ID);

  const locations = (profile.locations ?? []).filter(Boolean);
  if (locations.length > 0) db = db.in('city', locations);

  if (profile.fuel) db = db.eq('fuel', profile.fuel);
  if (profile.year_min) db = db.gte('year', profile.year_min);
  if (profile.mileage_max) db = db.lte('mileage', profile.mileage_max);
  if (profile.budget_min) db = db.gte('price', profile.budget_min);
  if (profile.budget_max) db = db.lte('price', profile.budget_max);

  const allowedBrands = [...(profile.preferred_brands ?? []), ...(profile.acceptable_brands ?? [])].filter(Boolean);
  if (allowedBrands.length > 0) db = db.in('brand', allowedBrands);

  const { count, error } = await db;
  if (error) throw error;

  return {
    matchedCount: count ?? 0,
    sourceSummary: {
      mode: 'stored_results_refresh',
      externalAdapter: 'not_configured',
      matchedStoredListings: count ?? 0
    }
  };
}

async function executeSearchJob(jobId: string, profileId: string) {
  try {
    const profile = await getOwnedProfile(profileId);

    const refreshResult = await scanStoredListingsForProfile(profile);

    const completedAt = new Date().toISOString();

    const { error: jobError } = await supabase
      .from('search_jobs')
      .update({
        status: 'complete',
        completed_at: completedAt,
        added_count: 0,
        updated_count: refreshResult.matchedCount,
        failed_count: 0,
        source_summary: refreshResult.sourceSummary,
        error_log: null
      })
      .eq('id', jobId);

    if (jobError) throw jobError;

    await setProfileRunState(profileId, 'complete');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search job failed';

    await supabase
      .from('search_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_log: message,
        source_summary: {
          mode: 'stored_results_refresh',
          status: 'failed'
        }
      })
      .eq('id', jobId);

    await supabase
      .from('search_profiles')
      .update({
        last_run_status: 'failed',
        last_run_at: new Date().toISOString()
      })
      .eq('id', profileId)
      .eq('owner_id', env.DEFAULT_USER_ID);
  }
}

export async function createSearchJob(profileId: string) {
  await getOwnedProfile(profileId);

  const startedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from('search_jobs')
    .insert({
      profile_id: profileId,
      status: 'running',
      started_at: startedAt,
      added_count: 0,
      updated_count: 0,
      failed_count: 0,
      source_summary: {
        mode: 'stored_results_refresh',
        status: 'running'
      }
    })
    .select('id, status')
    .single();

  if (error || !data) throw error ?? new Error('Could not create search job.');

  await setProfileRunState(profileId, 'running');

  void executeSearchJob(data.id as string, profileId);

  return { jobId: data.id as string, status: data.status as string };
}

export async function getSearchJob(jobId: string) {
  const { data, error } = await supabase
    .from('search_jobs')
    .select('id, status, added_count, updated_count, failed_count, source_summary, completed_at, error_log')
    .eq('id', jobId)
    .single();

  if (error || !data) throw error ?? new Error('Search job not found.');

  return data as SearchJobRow;
}

export function isSearchJobFinal(job: SearchJobRow) {
  return isFinalStatus(job.status);
}
