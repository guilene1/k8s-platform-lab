import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { api, money } from '../api.js';
import { pretty } from '../dates.js';
import { ErrorNote, Loading } from '../components/Status.jsx';

const STEPS = ['reserved', 'picked_up', 'returned'];
const LABEL = { reserved: 'Reserved', picked_up: 'On the road', returned: 'Returned', cancelled: 'Cancelled' };

function Card({ code, email, isNew }) {
  const [b, setB] = useState(null);
  const [error, setError] = useState(null);
  const [km, setKm] = useState('');
  useEffect(() => { api(`/bookings/${code}?email=${encodeURIComponent(email)}`).then(setB).catch(setError); }, [code, email]);

  const act = async (what, extra = {}) => {
    setError(null);
    try { setB(await api(`/bookings/${code}/${what}`, { method: 'POST', body: { email, ...extra } })); } catch (e) { setError(e); }
  };

  if (!b && error) return <ErrorNote error={error} />;
  if (!b) return <Loading label="Finding your booking" />;
  const idx = STEPS.indexOf(b.status);

  return (
    <article className="ticket">
      <div className="ticket__img" style={{ backgroundImage: `url(${b.photo})` }} />
      <div className="ticket__body">
        {isNew && <p className="ok">Reserved! See you at {b.location_name}.</p>}
        <p className="tag tag--dark">{LABEL[b.status]} · {b.code}</p>
        <h2 className="h2">{b.vehicle_name}</h2>
        <p className="muted">{b.driver_name} · {pretty(b.pickup_date)} → {pretty(b.return_date)} · {b.days} days · {money(b.total_cents)}</p>
        <p>{b.location_name}, {b.address}, {b.city} · <span className="muted">{b.hours}</span></p>
        {b.status !== 'cancelled' && (
          <ol className="road">{STEPS.map((s, i) => <li key={s} className={i <= idx ? 'is-done' : ''}>{LABEL[s]}</li>)}</ol>
        )}
        {b.status === 'returned' && <p className="muted">Odometer {b.odometer_out?.toLocaleString()} → {b.odometer_in?.toLocaleString()} km ({(b.odometer_in - b.odometer_out).toLocaleString()} km driven)</p>}
        {error && <ErrorNote error={error} />}
        <div className="ticket__actions">
          {b.status === 'reserved' && <>
            <button className="btn btn--solid" onClick={() => act('pickup')}>Pick up the keys</button>
            <button className="btn btn--text" onClick={() => window.confirm('Cancel this booking?') && act('cancel')}>Cancel booking</button>
          </>}
          {b.status === 'picked_up' && (
            <form className="return" onSubmit={(e) => { e.preventDefault(); act('return', { km_driven: Number(km) }); }}>
              <input className="input" type="number" min="0" max="20000" required placeholder="Km driven" value={km} onChange={(e) => setKm(e.target.value)} />
              <button className="btn btn--solid">Return the car</button>
            </form>
          )}
          <Link to={`/cars/${b.vehicle_slug}`} className="link">View the car →</Link>
        </div>
      </div>
    </article>
  );
}

export default function Booking() {
  const { code } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [f, setF] = useState({ code: '', email: '' });
  return (
    <div className="wrap narrow">
      <h1 className="h1">My booking</h1>
      {code ? <Card code={code} email={params.get('email') || ''} isNew={params.get('new') === '1'} /> : (
        <>
          <form className="lookup" onSubmit={(e) => { e.preventDefault(); navigate(`/bookings/${f.code.trim().toUpperCase()}?email=${encodeURIComponent(f.email.trim())}`); }}>
            <input className="input" required placeholder="Booking code (DN-5150)" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} />
            <input className="input" required type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <button className="btn btn--solid">Find</button>
          </form>
          <p className="muted">Try <strong>DN-5150</strong> with <strong>alex.kim@example.com</strong>.</p>
        </>
      )}
    </div>
  );
}
