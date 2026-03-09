export type LocalFilters = {
  favoritesOnly: boolean;
  shortlistedOnly: boolean;
  hideRejected: boolean;
  includeExceptions: boolean;
  automaticOnly: boolean;
  minScore: number;
  city: string;
  brand: string;
};

export default function FilterBar({
  filters,
  onChange,
  cities,
  brands
}: {
  filters: LocalFilters;
  onChange: (next: LocalFilters) => void;
  cities: string[];
  brands: string[];
}) {
  const update = <K extends keyof LocalFilters>(key: K, value: LocalFilters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Instant local filters</div>
          <h2>Browse stored results</h2>
        </div>
      </div>

      <div className="filter-grid">
        <label className="checkbox-row"><input type="checkbox" checked={filters.favoritesOnly} onChange={(e) => update('favoritesOnly', e.target.checked)} /> Favorites only</label>
        <label className="checkbox-row"><input type="checkbox" checked={filters.shortlistedOnly} onChange={(e) => update('shortlistedOnly', e.target.checked)} /> Shortlist only</label>
        <label className="checkbox-row"><input type="checkbox" checked={filters.hideRejected} onChange={(e) => update('hideRejected', e.target.checked)} /> Hide rejected</label>
        <label className="checkbox-row"><input type="checkbox" checked={filters.includeExceptions} onChange={(e) => update('includeExceptions', e.target.checked)} /> Include exceptions</label>
        <label className="checkbox-row"><input type="checkbox" checked={filters.automaticOnly} onChange={(e) => update('automaticOnly', e.target.checked)} /> Automatic only</label>

        <label className="field">
          <span>Minimum score</span>
          <input type="number" min={0} max={100} value={filters.minScore} onChange={(e) => update('minScore', Number(e.target.value || 0))} />
        </label>

        <label className="field">
          <span>City</span>
          <select value={filters.city} onChange={(e) => update('city', e.target.value)}>
            <option value="">All cities</option>
            {cities.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Brand</span>
          <select value={filters.brand} onChange={(e) => update('brand', e.target.value)}>
            <option value="">All brands</option>
            {brands.map((brand) => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
