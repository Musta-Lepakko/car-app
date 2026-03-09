import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Wifi, WifiOff } from 'lucide-react';
import FilterBar, { type LocalFilters } from './components/FilterBar';
import ListingCard from './components/ListingCard';
import SearchProfileBar from './components/SearchProfileBar';
import DetailPanel from './components/DetailPanel';
import { getHealth, getListings, getSearchProfiles, patchListingState } from './lib/api';
import type { ListingItem, SearchProfile } from './types';

const initialFilters: LocalFilters = {
  favoritesOnly: false,
  shortlistedOnly: false,
  hideRejected: true,
  includeExceptions: true,
  automaticOnly: false,
  minScore: 0,
  city: '',
  brand: ''
};

export default function App() {
  const [profiles, setProfiles] = useState<SearchProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [filters, setFilters] = useState<LocalFilters>(initialFilters);
  const [selectedListing, setSelectedListing] = useState<ListingItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [message, setMessage] = useState('');

  const loadProfiles = async () => {
    const data = await getSearchProfiles();
    setProfiles(data);
    if (!selectedProfileId && data[0]) {
      setSelectedProfileId(data[0].id);
    }
  };

  const loadListings = async (profileId: string) => {
    if (!profileId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('profileId', profileId);
      params.set('sortBy', 'score_desc');
      if (filters.city) params.set('city', filters.city);
      if (filters.brand) params.set('brand', filters.brand);
      if (filters.favoritesOnly) params.set('favoritesOnly', 'true');
      if (filters.shortlistedOnly) params.set('shortlistedOnly', 'true');
      if (filters.hideRejected) params.set('hideRejected', 'true');
      if (!filters.includeExceptions) params.set('includeExceptions', 'false');
      if (filters.automaticOnly) params.set('transmission', 'Automatic');
      if (filters.minScore > 0) params.set('minScore', String(filters.minScore));

      const data = await getListings(params);
      setListings(data.items);
      setSelectedListing((prev) => data.items.find((x) => x.id === prev?.id) || data.items[0] || null);
      setMessage(`Loaded ${data.total} listing${data.total === 1 ? '' : 's'}.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getHealth().then((res) => setHealthOk(res.ok)).catch(() => setHealthOk(false));
    loadProfiles().catch((err) => setMessage(`Profile load failed: ${String(err)}`));
  }, []);

  useEffect(() => {
    if (selectedProfileId) {
      loadListings(selectedProfileId).catch((err) => setMessage(`Listing load failed: ${String(err)}`));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProfileId, filters]);

  const cities = useMemo(() => [...new Set(listings.map((item) => item.city).filter(Boolean))].sort(), [listings]);
  const brands = useMemo(() => [...new Set(listings.map((item) => item.brand).filter(Boolean) as string[])].sort(), [listings]);

  const updateState = async (listing: ListingItem, patch: { favorite?: boolean; shortlisted?: boolean; rejected?: boolean; notes?: string | null }) => {
    await patchListingState(listing.id, patch);
    await loadListings(selectedProfileId);
  };

  const topCount = listings.filter((item) => item.score.totalScore >= 80).length;
  const favoriteCount = listings.filter((item) => item.userState.favorite).length;

  return (
    <div className="app-shell">
      <div className="container">
        <SearchProfileBar
          profiles={profiles}
          selectedId={selectedProfileId}
          onSelectedIdChange={setSelectedProfileId}
          onRefresh={() => void loadListings(selectedProfileId)}
        />

        <div className="summary-row">
          <div className="summary-card"><span>Total visible</span><strong>{listings.length}</strong></div>
          <div className="summary-card"><span>Top candidates</span><strong>{topCount}</strong></div>
          <div className="summary-card"><span>Favorites</span><strong>{favoriteCount}</strong></div>
          <div className="summary-card status-card">
            <span>Backend</span>
            <strong>{healthOk ? <><Wifi size={16} /> Online</> : healthOk === false ? <><WifiOff size={16} /> Offline</> : 'Checking...'}</strong>
          </div>
        </div>

        <FilterBar filters={filters} onChange={setFilters} cities={cities} brands={brands} />

        {message && <div className="banner"><BadgeCheck size={16} /> {message}</div>}

        <div className="content-grid">
          <section className="panel listings-panel">
            <div className="panel-header">
              <div>
                <div className="eyebrow">Listings</div>
                <h2>{loading ? 'Loading…' : 'Live API results'}</h2>
              </div>
            </div>
            <div className="cards-grid">
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onSelect={setSelectedListing}
                  onToggleFavorite={(item) => void updateState(item, { favorite: !item.userState.favorite })}
                  onToggleShortlist={(item) => void updateState(item, { shortlisted: !item.userState.shortlisted })}
                />
              ))}
              {!loading && listings.length === 0 && (
                <div className="empty-listings">
                  <h3>No results</h3>
                  <p className="muted">Try changing local filters or choosing a different saved search profile.</p>
                </div>
              )}
            </div>
          </section>

          <DetailPanel listing={selectedListing} onSaveNotes={(item, notes) => void updateState(item, { notes })} />
        </div>
      </div>
    </div>
  );
}
