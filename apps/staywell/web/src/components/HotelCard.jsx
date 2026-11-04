import { Link } from 'react-router';
import { money } from '../api.js';

export default function HotelCard({ hotel, query }) {
  return (
    <Link to={`/hotels/${hotel.slug}${query ? `?${query}` : ''}`} className="hcard">
      <div className="hcard__img" style={{ backgroundImage: `url(${hotel.image})` }}>
        <span className="hcard__stars">{'★'.repeat(hotel.stars)}</span>
      </div>
      <div className="hcard__body">
        <span className="hcard__place">{hotel.city}, {hotel.country}</span>
        <h3>{hotel.name}</h3>
        <p>{hotel.summary}</p>
        <div className="hcard__foot">
          <span><strong>{money(hotel.from_cents)}</strong> / night</span>
          <span className="hcard__rating">{hotel.rating.toFixed(1)} · {hotel.review_count.toLocaleString()} reviews</span>
        </div>
        {hotel.rooms_left != null && (
          <span className={`avail ${hotel.rooms_left ? '' : 'avail--none'}`}>
            {hotel.rooms_left ? (hotel.rooms_left < 4 ? `Only ${hotel.rooms_left} rooms left` : 'Available for your dates') : 'Fully booked'}
          </span>
        )}
      </div>
    </Link>
  );
}
