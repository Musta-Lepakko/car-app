import { supabase } from '../lib/supabase.js';
import { env } from '../lib/env.js';
import type { ListingOverviewRow } from '../types/api.js';

export type ListingsQuery = {
  city?: string;
  brand?: string;
  transmission?: string;
  minScore?: number;
  favoritesOnly?: boolean;
  shortlistedOnly?: boolean;
  hideRejected?: boolean;
  includeExceptions?: boolean;
  sortBy?: 'score_desc' | 'price_asc' | 'year_desc' | 'mileage_asc' | 'last_seen_desc';
};

const sortMap: Record<NonNullable<ListingsQuery['sortBy']>, { column: keyof ListingOverviewRow; ascending: boolean }> = {
  score_desc: { column: 'total_score', ascending: false },
  price_asc: { column: 'price', ascending: true },
  year_desc: { column: 'year', ascending: false },
  mileage_asc: { column: 'mileage', ascending: true },
  last_seen_desc: { column: 'last_seen_at', ascending: false }
};

export async function getListings(query: ListingsQuery) {
  let db = supabase
    .from('listing_overview')
    .select('*', { count: 'exact' })
    .eq('user_id', env.DEFAULT_USER_ID);

  if (query.city && query.city !== 'All') db = db.eq('city', query.city);
  if (query.brand && query.brand !== 'All') db = db.eq('brand', query.brand);
  if (query.transmission && query.transmission !== 'All') db = db.eq('transmission', query.transmission);
  if (typeof query.minScore === 'number') db = db.gte('total_score', query.minScore);
  if (query.favoritesOnly) db = db.eq('favorite', true);
  if (query.shortlistedOnly) db = db.eq('shortlisted', true);
  if (query.hideRejected) db = db.or('rejected.is.null,rejected.eq.false');
  if (query.includeExceptions === false) db = db.is('exception_reason', null);

  const sort = sortMap[query.sortBy ?? 'score_desc'];
  db = db.order(sort.column as string, { ascending: sort.ascending, nullsFirst: false });

  const { data, error, count } = await db;
  if (error) throw error;

  return { items: (data ?? []) as ListingOverviewRow[], total: count ?? 0 };
}

export async function updateListingState(listingId: string, payload: {
  favorite?: boolean;
  shortlisted?: boolean;
  rejected?: boolean;
  notes?: string | null;
}) {
  const { data, error } = await supabase
    .from('listing_user_state')
    .upsert({
      listing_id: listingId,
      user_id: env.DEFAULT_USER_ID,
      favorite: payload.favorite ?? false,
      shortlisted: payload.shortlisted ?? false,
      rejected: payload.rejected ?? false,
      notes: payload.notes ?? null
    }, { onConflict: 'listing_id,user_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}
