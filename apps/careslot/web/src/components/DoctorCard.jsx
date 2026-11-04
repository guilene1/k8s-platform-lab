import { Link } from 'react-router';
import { slotLabel } from '../time.js';

export default function DoctorCard({ d }) {
  return (
    <Link to={`/doctors/${d.slug}`} className="doc">
      <span className="doc__photo" style={{ backgroundImage: `url(${d.photo})` }} />
      <span className="doc__body">
        <span className="doc__spec">{d.specialty_name}</span>
        <strong>{d.full_name}</strong>
        <span className="muted">{d.credentials} · {d.clinic}</span>
        <span className="doc__meta">★ {d.rating.toFixed(1)} · {d.review_count} reviews · {d.languages.join(', ')}</span>
        {d.next_available !== undefined && (
          <span className={`doc__next ${d.next_available ? '' : 'is-none'}`}>
            {d.next_available ? `Next available: ${slotLabel(d.next_available)}` : 'No openings in the next two weeks'}
          </span>
        )}
      </span>
    </Link>
  );
}
