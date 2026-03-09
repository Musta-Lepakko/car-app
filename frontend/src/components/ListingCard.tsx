import { ExternalLink, Heart, ListChecks, MapPin, TriangleAlert } from 'lucide-react';
import type { ListingItem } from '../types';

const fmtCOP = (value: number) => `${(value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1)}M COP`;
const fmtKm = (value: number) => `${value.toLocaleString()} km`;

export default function ListingCard({
  listing,
  onToggleFavorite,
  onToggleShortlist,
  onSelect
}: {
  listing: ListingItem;
  onToggleFavorite: (listing: ListingItem) => void;
  onToggleShortlist: (listing: ListingItem) => void;
  onSelect: (listing: ListingItem) => void;
}) {
  return (
    <article className="listing-card" onClick={() => onSelect(listing)}>
      <div className="listing-top">
        <div>
          <div className="eyebrow">{listing.source}</div>
          <h3>{listing.title}</h3>
          <p className="muted">{listing.year} • {fmtKm(listing.mileage)} • {listing.transmission}</p>
        </div>
        <div className="score-pill">{listing.score.totalScore}</div>
      </div>

      <div className="stat-row">
        <div className="mini-stat"><span>Price</span><strong>{fmtCOP(listing.price)}</strong></div>
        <div className="mini-stat"><span>City</span><strong>{listing.city}</strong></div>
        <div className="mini-stat"><span>Fuel</span><strong>{listing.fuel}</strong></div>
        <div className="mini-stat"><span>Seller</span><strong>{listing.sellerType || 'Unknown'}</strong></div>
      </div>

      <div className="score-breakdown">
        <span>Fit {listing.score.fitScore}/45</span>
        <span>Practicality {listing.score.practicalityScore}/35</span>
        <span>Deal {listing.score.dealScore}/20</span>
      </div>

      <div className="tag-row">
        {listing.score.positiveTags.slice(0, 3).map((tag) => (
          <span className="tag positive" key={tag}>{tag}</span>
        ))}
        {listing.score.exceptionReason && <span className="tag caution">{listing.score.exceptionReason}</span>}
      </div>

      <div className="card-actions" onClick={(e) => e.stopPropagation()}>
        <button className={listing.userState.favorite ? 'secondary-button active' : 'secondary-button'} onClick={() => onToggleFavorite(listing)} type="button">
          <Heart size={16} /> Favorite
        </button>
        <button className={listing.userState.shortlisted ? 'secondary-button active' : 'secondary-button'} onClick={() => onToggleShortlist(listing)} type="button">
          <ListChecks size={16} /> Shortlist
        </button>
        <a className="secondary-button" href={listing.url} target="_blank" rel="noreferrer">
          <ExternalLink size={16} /> Listing
        </a>
      </div>

      <div className="card-footer">
        <span><MapPin size={14} /> {listing.city}</span>
        {listing.score.cautionTags.length > 0 && (
          <span className="warning-inline"><TriangleAlert size={14} /> {listing.score.cautionTags[0]}</span>
        )}
      </div>
    </article>
  );
}
