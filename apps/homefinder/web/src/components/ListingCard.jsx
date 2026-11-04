import { Link } from 'react-router';
import { compactPrice } from '../saved.js';

export default function ListingCard({ l, saved, onToggle }) {
  return (
    <article className="lcard">
      <Link to={`/homes/${l.slug}`} className="lcard__img" style={{ backgroundImage: l.cover ? `url(${l.cover})` : undefined }}>
        {l.status === 'pending' && <span className="flag">Under offer</span>}
        <span className="lcard__count">{l.photo_count} photos</span>
      </Link>
      <button className={`heart ${saved ? 'is-on' : ''}`} onClick={() => onToggle(l.slug)} aria-label={saved ? 'Remove from saved' : 'Save home'}>
        {saved ? '♥' : '♡'}
      </button>
      <Link to={`/homes/${l.slug}`} className="lcard__body">
        <div className="lcard__row">
          <span className="lcard__price">{compactPrice(l.price_cents)}</span>
          <span className="lcard__type">{l.property_type}</span>
        </div>
        <h3>{l.title}</h3>
        <p>{l.neighborhood}, {l.city}</p>
        <div className="specs"><span>{l.beds} bd</span><span>{l.baths} ba</span><span>{l.sqft.toLocaleString()} sqft</span></div>
      </Link>
    </article>
  );
}
