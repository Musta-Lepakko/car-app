import type { ListingsResponse, ListingItem, SearchProfile } from '../types';

const jsonHeaders = { 'Content-Type': 'application/json' };
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function apiUrl(path: string) {
  if (!API_BASE) return path;
  return `${API_BASE}${path}`;
}

type BackendSearchProfile = {
  id: string;
  name: string;
  locations: string[] | null;
  budget_min: number;
  budget_max: number;
  year_min: number;
  mileage_max: number;
  fuel: string;
  transmission_preference: string;
  preferred_brands: string[] | null;
  acceptable_brands: string[] | null;
  seller_preference: string;
  prioritize_flood_suitability: boolean;
  prioritize_cargo: boolean;
  prioritize_easy_parking: boolean;
  include_exception_candidates: boolean;
  source_selection: string[] | null;
  max_results: number;
  last_run_at?: string | null;
  last_run_status?: string | null;
};

type BackendListingRow = {
  listing_id: string;
  source: string;
  source_listing_id: string | null;
  url: string;
  title: string;
  brand: string | null;
  model: string | null;
  trim: string | null;
  price: number | null;
  year: number | null;
  mileage: number | null;
  transmission: string | null;
  fuel: string | null;
  city: string | null;
  seller_type: string | null;
  photo_url: string | null;
  fetched_at: string;
  last_seen_at: string;
  fit_score: number | null;
  practicality_score: number | null;
  deal_score: number | null;
  total_score: number | null;
  positive_tags: string[] | null;
  caution_tags: string[] | null;
  exception_reason: string | null;
  scoring_version: string | null;
  favorite: boolean | null;
  shortlisted: boolean | null;
  rejected: boolean | null;
  notes: string | null;
};

type BackendListingsResponse = {
  items: BackendListingRow[];
  total: number;
};

async function check<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function mapSearchProfile(row: BackendSearchProfile): SearchProfile {
  return {
    id: row.id,
    name: row.name,
    locations: row.locations ?? [],
    budgetMin: row.budget_min,
    budgetMax: row.budget_max,
    yearMin: row.year_min,
    mileageMax: row.mileage_max,
    fuel: row.fuel,
    transmissionPreference: row.transmission_preference,
    preferredBrands: row.preferred_brands ?? [],
    acceptableBrands: row.acceptable_brands ?? [],
    sellerPreference: row.seller_preference,
    prioritizeFloodSuitability: row.prioritize_flood_suitability,
    prioritizeCargo: row.prioritize_cargo,
    prioritizeEasyParking: row.prioritize_easy_parking,
    includeExceptionCandidates: row.include_exception_candidates,
    sourceSelection: row.source_selection ?? [],
    maxResults: row.max_results,
    lastRunAt: row.last_run_at ?? undefined,
    lastRunStatus: row.last_run_status ?? undefined
  };
}

function mapListingRow(row: BackendListingRow): ListingItem {
  return {
    id: row.listing_id,
    title: row.title,
    source: row.source,
    url: row.url,
    brand: row.brand,
    model: row.model,
    trim: row.trim,
    price: row.price ?? 0,
    year: row.year ?? 0,
    mileage: row.mileage ?? 0,
    transmission: row.transmission ?? 'Unknown',
    fuel: row.fuel ?? 'Unknown',
    city: row.city ?? 'Unknown',
    sellerType: row.seller_type,
    photoUrl: row.photo_url,
    fetchedAt: row.fetched_at,
    score: {
      fitScore: row.fit_score ?? 0,
      practicalityScore: row.practicality_score ?? 0,
      dealScore: row.deal_score ?? 0,
      totalScore: row.total_score ?? 0,
      positiveTags: row.positive_tags ?? [],
      cautionTags: row.caution_tags ?? [],
      exceptionReason: row.exception_reason ?? null
    },
    userState: {
      favorite: row.favorite ?? false,
      shortlisted: row.shortlisted ?? false,
      rejected: row.rejected ?? false,
      notes: row.notes ?? null
    }
  };
}

export async function getHealth() {
  return check<{ ok: boolean }>(await fetch(apiUrl('/health')));
}

export async function getSearchProfiles() {
  const rows = await check<BackendSearchProfile[]>(await fetch(apiUrl('/api/search-profiles')));
  return rows.map(mapSearchProfile);
}

export async function getListings(params: URLSearchParams): Promise<ListingsResponse> {
  const data = await check<BackendListingsResponse>(await fetch(apiUrl(`/api/listings?${params.toString()}`)));
  return {
    items: data.items.map(mapListingRow),
    total: data.total
  };
}

export async function patchListingState(
  listingId: string,
  payload: { favorite?: boolean; shortlisted?: boolean; rejected?: boolean; notes?: string | null }
) {
  return check(
    await fetch(apiUrl(`/api/listings/${listingId}/state`), {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify(payload)
    })
  );
}
