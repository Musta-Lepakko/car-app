import { LoaderCircle, RefreshCcw } from 'lucide-react';
import type { SearchProfile } from '../types';

export default function SearchProfileBar({
  profiles,
  selectedId,
  onSelectedIdChange,
  onRefresh,
  isUpdating
}: {
  profiles: SearchProfile[];
  selectedId: string;
  onSelectedIdChange: (value: string) => void;
  onRefresh: () => void;
  isUpdating: boolean;
}) {
  const selected = profiles.find((p) => p.id === selectedId);

  return (
    <section className="panel profile-bar">
      <div>
        <div className="eyebrow">Saved search</div>
        <h1>Car shortlist dashboard</h1>
        <p className="muted">
          Live frontend skeleton connected to the backend API. Use this as the base for the shareable app.
        </p>
      </div>

      <div className="profile-actions">
        <label className="field compact-field">
          <span>Search profile</span>
          <select value={selectedId} onChange={(e) => onSelectedIdChange(e.target.value)} disabled={isUpdating}>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </label>

        <button className="primary-button" onClick={onRefresh} type="button" disabled={isUpdating || !selectedId}>
          {isUpdating ? <LoaderCircle size={16} className="spin" /> : <RefreshCcw size={16} />}
          {isUpdating ? 'Updating…' : 'Update results'}
        </button>
      </div>

      {selected && (
        <div className="profile-meta">
          <span>{selected.locations.join(', ') || 'No locations'}</span>
          <span>{Math.round(selected.budgetMin / 1000000)}M–{Math.round(selected.budgetMax / 1000000)}M COP</span>
          <span>{selected.yearMin}+ year</span>
          <span>{selected.mileageMax.toLocaleString()} km max</span>
          <span>{selected.lastRunStatus || 'idle'}</span>
        </div>
      )}
    </section>
  );
}
