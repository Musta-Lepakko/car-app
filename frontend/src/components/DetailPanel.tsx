import { ExternalLink, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ListingItem } from '../types';

export default function DetailPanel({
  listing,
  onSaveNotes,
}: {
  listing: ListingItem | null;
  onSaveNotes: (listing: ListingItem, notes: string) => void;
}) {
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setNotes(listing?.userState.notes || '');
  }, [listing]);

  if (!listing) {
    return (
      <aside className="panel detail-panel empty-state">
        <h2>Select a car</h2>
        <p className="muted">Tap a listing card to see more detail and save notes.</p>
      </aside>
    );
  }

  return (
    <aside className="panel detail-panel">
      <div className="eyebrow">Selected car</div>
      <h2>{listing.title}</h2>
      <p className="muted">{listing.source} • {listing.city}</p>

      <div className="detail-grid">
        <div className="mini-stat"><span>Score</span><strong>{listing.score.totalScore}</strong></div>
        <div className="mini-stat"><span>Fit</span><strong>{listing.score.fitScore}/45</strong></div>
        <div className="mini-stat"><span>Practicality</span><strong>{listing.score.practicalityScore}/35</strong></div>
        <div className="mini-stat"><span>Deal</span><strong>{listing.score.dealScore}/20</strong></div>
      </div>

      <div className="tag-row">
        {listing.score.positiveTags.map((tag) => <span key={tag} className="tag positive">{tag}</span>)}
        {listing.score.cautionTags.map((tag) => <span key={tag} className="tag caution">{tag}</span>)}
      </div>

      <label className="field">
        <span>Shared note</span>
        <textarea rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      <div className="card-actions">
        <button className="primary-button" type="button" onClick={() => onSaveNotes(listing, notes)}>
          <Save size={16} /> Save note
        </button>
        <a className="secondary-button" href={listing.url} target="_blank" rel="noreferrer">
          <ExternalLink size={16} /> Open listing
        </a>
      </div>
    </aside>
  );
}
