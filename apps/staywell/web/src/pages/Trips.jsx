import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { api, money } from '../api.js';
import { useApi } from '../useApi.js';
import { pretty } from '../dates.js';
import { ErrorNote, Loading } from '../components/Status.jsx';

function Reservation({ code, email, isNew }) {
  const { data, error, loading } = useApi(`/reservations/${code}?email=${encodeURIComponent(email)}`);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState(null);
  const r = res || data;
  if (loading) return <Loading label="Finding your reservation" />;
  if (error) return <ErrorNote error={error} />;

  async function cancel() {
    if (!window.confirm('Cancel this reservation?')) return;
    try { setRes(await api(`/reservations/${code}/cancel`, { method: 'POST', body: { email } })); } catch (e) { setErr(e); }
  }

  return (
    <article className={`trip ${r.status === 'cancelled' ? 'trip--cancelled' : ''}`}>
      <div className="trip__img" style={{ backgroundImage: `url(${r.hotel_image})` }} />
      <div className="trip__body">
        {isNew && r.status === 'confirmed' && <p className="ok">You're booked. A confirmation is on its way to {r.email}.</p>}
        <p className="eyebrow eyebrow--dark">{r.status === 'cancelled' ? 'Cancelled' : 'Confirmed'} · {r.code}</p>
        <h2 className="title">{r.hotel_name}</h2>
        <p className="muted">{r.city}, {r.country} · {r.room_name}</p>
        <dl className="trip__facts">
          <div><dt>Check in</dt><dd>{pretty(r.check_in)}</dd></div>
          <div><dt>Check out</dt><dd>{pretty(r.check_out)}</dd></div>
          <div><dt>Nights</dt><dd>{r.nights}</dd></div>
          <div><dt>Guests</dt><dd>{r.guests}</dd></div>
          <div><dt>Total</dt><dd>{money(r.total_cents)}</dd></div>
        </dl>
        {err && <ErrorNote error={err} />}
        <div className="trip__actions">
          <Link to={`/hotels/${r.hotel_slug}`} className="btn btn--outline">View hotel</Link>
          {r.status === 'confirmed' && <button className="btn btn--text" onClick={cancel}>Cancel reservation</button>}
        </div>
      </div>
    </article>
  );
}

export default function Trips() {
  const { code } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ code: '', email: '' });
  const saved = JSON.parse(localStorage.getItem('staywell.trips') || '[]');

  return (
    <div className="wrap narrow">
      {code ? (
        <>
          <Reservation code={code} email={params.get('email') || ''} isNew={params.get('new') === '1'} />
          <Link to="/trips" className="link">← Find another reservation</Link>
        </>
      ) : (
        <>
          <p className="eyebrow eyebrow--dark">My trips</p>
          <h1 className="title">Find your reservation</h1>
          <form className="lookup" onSubmit={(e) => { e.preventDefault(); navigate(`/trips/${form.code.trim().toUpperCase()}?email=${encodeURIComponent(form.email.trim())}`); }}>
            <input className="input" required placeholder="Confirmation code (SW-4821)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <input className="input" required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <button className="btn btn--solid">Find</button>
          </form>
          <p className="muted">Try <strong>SW-4821</strong> with <strong>noor.haddad@example.com</strong>.</p>
          {saved.length > 0 && (
            <div className="saved">
              <h3>Booked on this device</h3>
              {saved.map((s) => <Link key={s.code} className="chip" to={`/trips/${s.code}?email=${encodeURIComponent(s.email)}`}>{s.code}</Link>)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
