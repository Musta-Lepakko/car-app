import { supabase } from '../lib/supabase.js';
import { env } from '../lib/env.js';
import { searchMercadoLibreVehicles, type SearchProfileForAdapter, type NormalizedVehicleCandidate } from '../adapters/mercadoLibreSearchAdapter.js';

type SearchProfileRow = SearchProfileForAdapter & {
  owner_id: string;
  include_exception_candidates?: boolean | null;
  prioritize_flood_suitability?: boolean | null;
  prioritize_cargo?: boolean | null;
  prioritize_easy_parking?: boolean | null;
  max_results?: number | null;
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

type ScorePayload = {
  fitScore: number;
  practicalityScore: number;
  dealScore: number;
  totalScore: number;
  positiveTags: string[];
  cautionTags: string[];
  exceptionReason: string | null;
};

type CandidateWithScore = {
  candidate: NormalizedVehicleCandidate;
  score: ScorePayload;
};

function isFinalStatus(status: string) {
  return status === 'complete' || status === 'partial' || status === 'failed';
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function titleHasAny(title: string, needles: string[]) {
  const normalized = normalizeText(title);
  return needles.some((needle) => normalized.includes(needle));
}

function getAllowedBrands(profile: SearchProfileRow) {
  return [...(profile.preferred_brands ?? []), ...(profile.acceptable_brands ?? [])].filter(Boolean);
}

function getProfileLocations(profile: SearchProfileRow) {
  return (profile.locations ?? []).filter(Boolean);
}

function computeExceptionReason(candidate: NormalizedVehicleCandidate, profile: SearchProfileRow) {
  const locations = getProfileLocations(profile).map(normalizeText);
  const city = normalizeText(candidate.city ?? '');
  const budgetMin = profile.budget_min ?? 0;
  const budgetMax = profile.budget_max ?? 0;

  if (candidate.price != null && budgetMin > 0 && candidate.price < budgetMin) {
    return 'Below preferred budget range';
  }

  if (candidate.price != null && budgetMax > 0 && candidate.price > budgetMax) {
    return 'Above preferred budget range';
  }

  if (candidate.year != null && profile.year_min > 0 && candidate.year < profile.year_min) {
    return 'Older than preferred minimum year';
  }

  if (candidate.mileage != null && profile.mileage_max > 0 && candidate.mileage > profile.mileage_max) {
    return 'Over mileage preference';
  }

  if (profile.fuel && normalizeText(profile.fuel).includes('gas') && candidate.fuel && normalizeText(candidate.fuel) !== 'gasoline') {
    return `Fuel mismatch (${candidate.fuel})`;
  }

  if (locations.length > 0 && city && !locations.some((location) => city.includes(location) || location.includes(city))) {
    return 'Outside preferred geography';
  }

  return null;
}

function computePriceFit(candidate: NormalizedVehicleCandidate, profile: SearchProfileRow) {
  if (candidate.price == null) return 0;
  const min = profile.budget_min;
  const max = profile.budget_max;

  if (candidate.price >= min && candidate.price <= Math.min(max, 50_000_000)) return 8;
  if (candidate.price >= Math.max(min, 50_000_001) && candidate.price <= max) return 6;
  if ((candidate.price >= min - 3_000_000 && candidate.price < min) || (candidate.price > max && candidate.price <= max + 3_000_000)) {
    return 3;
  }
  return 0;
}

function computeYearFit(candidate: NormalizedVehicleCandidate) {
  if (!candidate.year) return 0;
  if (candidate.year >= 2024) return 14;
  if (candidate.year >= 2022) return 12;
  if (candidate.year >= 2020) return 8;
  if (candidate.year >= 2018) return 4;
  return 0;
}

function computeMileageFit(candidate: NormalizedVehicleCandidate) {
  if (candidate.mileage == null) return 0;
  if (candidate.mileage < 40_000) return 8;
  if (candidate.mileage < 55_000) return 6;
  if (candidate.mileage < 70_000) return 4;
  if (candidate.mileage < 75_000) return 2;
  return 0;
}

function computeTransmissionFit(candidate: NormalizedVehicleCandidate) {
  const normalized = normalizeText(candidate.transmission ?? '');
  if (normalized.includes('auto')) return 5;
  if (normalized.includes('manual') || normalized.includes('mecan')) return 3;
  return 2;
}

function computeLocationFit(candidate: NormalizedVehicleCandidate, profile: SearchProfileRow) {
  const locations = getProfileLocations(profile).map(normalizeText);
  const city = normalizeText(candidate.city ?? '');
  if (!city || locations.length === 0) return 2;
  if (locations[0] && city.includes(locations[0])) return 10;
  if (locations[1] && city.includes(locations[1])) return 6;
  if (locations.some((location) => city.includes(location))) return 4;
  return 0;
}

function computeBrandScore(candidate: NormalizedVehicleCandidate, profile: SearchProfileRow) {
  const brand = normalizeText(candidate.brand ?? '');
  if (!brand) return 0;
  const preferred = (profile.preferred_brands ?? []).map(normalizeText);
  const acceptable = (profile.acceptable_brands ?? []).map(normalizeText);

  if (preferred.includes(brand)) return 8;
  if (acceptable.includes(brand)) return 5;
  return 2;
}

function inferPracticalitySignals(candidate: NormalizedVehicleCandidate, profile: SearchProfileRow) {
  const title = normalizeText(`${candidate.title} ${candidate.model ?? ''}`);
  const raised = ['stepway', 'duster', 'captur', 'tracker', 'ecosport', 'cross'];
  const tiny = ['picanto', 'kwid', 'spark', 'march', 'alto'];
  const balanced = ['sandero', 'logan', 'swift dzire', 'dzire'];
  const compact = ['swift'];

  let ground = { points: 6, label: 'Acceptable' };
  let cargo = { points: 6, label: 'Manageable' };
  let parking = { points: 6, label: 'Manageable' };
  const positiveTags: string[] = [];
  const cautionTags: string[] = [];

  if (titleHasAny(title, raised)) {
    ground = { points: profile.prioritize_flood_suitability === false ? 8 : 10, label: 'Good clearance' };
    cargo = { points: profile.prioritize_cargo === false ? 7 : 9, label: 'Fits bike + groceries' };
    parking = { points: 6, label: 'Manageable' };
    positiveTags.push('Strong flood suitability', 'Family practical');
  } else if (titleHasAny(title, balanced)) {
    ground = { points: 6, label: 'Acceptable' };
    cargo = { points: 9, label: 'Fits bike + groceries' };
    parking = { points: 6, label: 'Manageable' };
    positiveTags.push('Family practical');
  } else if (titleHasAny(title, compact)) {
    ground = { points: 2, label: 'Low' };
    cargo = { points: 6, label: 'Manageable' };
    parking = { points: 8, label: 'Easy' };
    cautionTags.push('Low clearance risk');
  } else if (titleHasAny(title, tiny)) {
    ground = { points: 2, label: 'Low' };
    cargo = { points: 3, label: 'Tight / uncertain' };
    parking = { points: 8, label: 'Easy' };
    cautionTags.push('Low clearance risk', 'Tight cargo fit');
  }

  return { ground, cargo, parking, positiveTags, cautionTags };
}

function computeDealScore(candidate: NormalizedVehicleCandidate, profile: SearchProfileRow, exceptionReason: string | null) {
  let completeness = 0;
  const fields = [candidate.title, candidate.url, candidate.price, candidate.year, candidate.mileage, candidate.photoUrl];
  const present = fields.filter((value) => value != null && value !== '').length;
  if (present >= 6) completeness = 6;
  else if (present >= 4) completeness = 4;
  else if (present >= 2) completeness = 2;

  let valueScore = 4;
  if (candidate.price != null && candidate.price >= profile.budget_min && candidate.price <= profile.budget_max && (candidate.year ?? 0) >= 2022 && (candidate.mileage ?? 999_999) <= 60_000) {
    valueScore = 10;
  } else if (candidate.price != null && candidate.price >= profile.budget_min && candidate.price <= profile.budget_max && (candidate.year ?? 0) >= 2020 && (candidate.mileage ?? 999_999) <= 75_000) {
    valueScore = 7;
  } else if (exceptionReason) {
    valueScore = 2;
  }

  return Math.max(0, Math.min(20, completeness + valueScore));
}

function scoreCandidate(candidate: NormalizedVehicleCandidate, profile: SearchProfileRow): ScorePayload {
  const exceptionReason = computeExceptionReason(candidate, profile);

  const fitScore =
    computePriceFit(candidate, profile) +
    computeYearFit(candidate) +
    computeMileageFit(candidate) +
    computeTransmissionFit(candidate) +
    computeLocationFit(candidate, profile);

  const practicalitySignals = inferPracticalitySignals(candidate, profile);
  const practicalityScore = Math.max(
    0,
    Math.min(
      35,
      computeBrandScore(candidate, profile) +
        practicalitySignals.ground.points +
        practicalitySignals.cargo.points +
        practicalitySignals.parking.points
    )
  );

  const dealScore = computeDealScore(candidate, profile, exceptionReason);
  const totalScore = fitScore + practicalityScore + dealScore;

  const positiveTags = [...practicalitySignals.positiveTags];
  const cautionTags = [...practicalitySignals.cautionTags];

  if ((candidate.year ?? 0) >= 2022) positiveTags.push('Newer-year standout');
  if (normalizeText(candidate.transmission ?? '').includes('auto')) positiveTags.push('Good automatic option');
  if (computeBrandScore(candidate, profile) >= 8) positiveTags.push('Strong local support');
  if (dealScore >= 14) positiveTags.push('Good value');

  if ((candidate.mileage ?? 0) > profile.mileage_max && profile.mileage_max > 0) cautionTags.push('High mileage edge');
  if (exceptionReason) cautionTags.push('Exception candidate');
  if (!candidate.photoUrl) cautionTags.push('Weak listing details');
  if (candidate.price != null && candidate.price > profile.budget_max) cautionTags.push('Price needs comparison');

  return {
    fitScore,
    practicalityScore,
    dealScore,
    totalScore,
    positiveTags: Array.from(new Set(positiveTags)),
    cautionTags: Array.from(new Set(cautionTags)),
    exceptionReason
  };
}

function matchesBrandPreference(candidate: NormalizedVehicleCandidate, profile: SearchProfileRow) {
  const allowed = getAllowedBrands(profile).map(normalizeText);
  if (allowed.length === 0) return true;
  const brand = normalizeText(candidate.brand ?? '');
  return allowed.includes(brand);
}

function keepCandidate(candidate: NormalizedVehicleCandidate, profile: SearchProfileRow, score: ScorePayload) {
  if (!matchesBrandPreference(candidate, profile)) return false;
  if (profile.include_exception_candidates === false && score.exceptionReason) return false;
  return true;
}

async function getOwnedProfile(profileId: string): Promise<SearchProfileRow> {
  const { data, error } = await supabase
    .from('search_profiles')
    .select('id, owner_id, locations, budget_min, budget_max, year_min, mileage_max, fuel, preferred_brands, acceptable_brands, transmission_preference, include_exception_candidates, prioritize_flood_suitability, prioritize_cargo, prioritize_easy_parking, max_results')
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

async function ensureUserState(listingId: string) {
  const { error } = await supabase
    .from('listing_user_state')
    .upsert(
      {
        listing_id: listingId,
        user_id: env.DEFAULT_USER_ID,
        favorite: false,
        shortlisted: false,
        rejected: false,
        notes: null,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'listing_id,user_id' }
    );

  if (error) throw error;
}

async function upsertListingScore(listingId: string, score: ScorePayload) {
  const { error } = await supabase.from('listing_scores').upsert(
    {
      listing_id: listingId,
      fit_score: score.fitScore,
      practicality_score: score.practicalityScore,
      deal_score: score.dealScore,
      total_score: score.totalScore,
      positive_tags: score.positiveTags,
      caution_tags: score.cautionTags,
      exception_reason: score.exceptionReason,
      scoring_version: 'v2-mercadolibre-adapter',
      updated_at: new Date().toISOString()
    },
    { onConflict: 'listing_id' }
  );

  if (error) throw error;
}

async function writeHistory(listingId: string, totalScore: number, price: number | null | undefined) {
  const { error } = await supabase.from('listing_history').insert({
    listing_id: listingId,
    seen_at: new Date().toISOString(),
    price: price ?? null,
    total_score: totalScore,
    status_snapshot: {
      source: 'MercadoLibre',
      refreshMode: 'external_adapter'
    }
  });

  if (error) throw error;
}

async function persistCandidates(candidates: CandidateWithScore[]) {
  let addedCount = 0;
  let updatedCount = 0;

  for (const { candidate, score } of candidates) {
    const now = new Date().toISOString();

    const { data: existing, error: existingError } = await supabase
      .from('listings')
      .select('id')
      .eq('normalized_hash', candidate.normalizedHash)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from('listings')
        .update({
          source: candidate.source,
          source_listing_id: candidate.sourceListingId,
          url: candidate.url,
          title: candidate.title,
          brand: candidate.brand,
          model: candidate.model,
          trim: candidate.trim,
          price: candidate.price,
          year: candidate.year,
          mileage: candidate.mileage,
          transmission: candidate.transmission,
          fuel: candidate.fuel,
          city: candidate.city,
          seller_type: candidate.sellerType,
          photo_url: candidate.photoUrl,
          raw_payload: candidate.rawPayload,
          fetched_at: now,
          last_seen_at: now
        })
        .eq('id', existing.id);

      if (updateError) throw updateError;

      await upsertListingScore(existing.id as string, score);
      await ensureUserState(existing.id as string);
      await writeHistory(existing.id as string, score.totalScore, candidate.price);
      updatedCount += 1;
      continue;
    }

    const { data: inserted, error: insertError } = await supabase
      .from('listings')
      .insert({
        source: candidate.source,
        source_listing_id: candidate.sourceListingId,
        url: candidate.url,
        title: candidate.title,
        brand: candidate.brand,
        model: candidate.model,
        trim: candidate.trim,
        price: candidate.price,
        year: candidate.year,
        mileage: candidate.mileage,
        transmission: candidate.transmission,
        fuel: candidate.fuel,
        city: candidate.city,
        seller_type: candidate.sellerType,
        photo_url: candidate.photoUrl,
        raw_payload: candidate.rawPayload,
        normalized_hash: candidate.normalizedHash,
        fetched_at: now,
        last_seen_at: now
      })
      .select('id')
      .single();

    if (insertError || !inserted) throw insertError ?? new Error('Could not insert listing');

    await upsertListingScore(inserted.id as string, score);
    await ensureUserState(inserted.id as string);
    await writeHistory(inserted.id as string, score.totalScore, candidate.price);
    addedCount += 1;
  }

  return { addedCount, updatedCount };
}

async function executeSearchJob(jobId: string, profileId: string) {
  try {
    const profile = await getOwnedProfile(profileId);

    const adapterResult = await searchMercadoLibreVehicles(profile);
    const scoredCandidates = adapterResult.candidates
      .map((candidate) => ({ candidate, score: scoreCandidate(candidate, profile) }))
      .filter(({ candidate, score }) => keepCandidate(candidate, profile, score))
      .sort((a, b) => b.score.totalScore - a.score.totalScore)
      .slice(0, Math.max(1, profile.max_results ?? 100));

    const persisted = await persistCandidates(scoredCandidates);
    const completedAt = new Date().toISOString();

    const status = adapterResult.summary.failedCount > 0 && adapterResult.summary.successfulCount > 0 ? 'partial' : 'complete';

    const { error: jobError } = await supabase
      .from('search_jobs')
      .update({
        status,
        completed_at: completedAt,
        added_count: persisted.addedCount,
        updated_count: persisted.updatedCount,
        failed_count: adapterResult.summary.failedCount,
        source_summary: {
          mode: 'external_adapter',
          adapter: 'mercadolibre_public_search',
          ...adapterResult.summary,
          keptCandidates: scoredCandidates.length,
          addedCount: persisted.addedCount,
          updatedCount: persisted.updatedCount
        },
        error_log: adapterResult.summary.failedCount > 0 ? adapterResult.summary.failures.join(' | ') : null
      })
      .eq('id', jobId);

    if (jobError) throw jobError;

    await setProfileRunState(profileId, status);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search job failed';

    await supabase
      .from('search_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_log: message,
        source_summary: {
          mode: 'external_adapter',
          adapter: 'mercadolibre_public_search',
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
        mode: 'external_adapter',
        adapter: 'mercadolibre_public_search',
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
