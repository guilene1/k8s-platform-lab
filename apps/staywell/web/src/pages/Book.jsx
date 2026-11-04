import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { api, money } from '../api.js';
import { useApi } from '../useApi.js';
import { nightsBetween, pretty, stayFrom, stayQuery } from '../dates.js';
import { ErrorNote, Loading } from '../components/Status.jsx';

export default function Book() {
  const { slug, roomId } = useParams();
  const [params] = useSearchParams();
  const stay = stayFrom(params);
  const navigate = useNavigate();
  const { data: h, error, loading } = useApi(`/hotels/${slug}?${stayQuery(stay)}`);
  const [form, setForm] = useState({ guest_name: '', email: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  if (loading) return <div className="wrap"><Loading /></div>;
  if (error) return <div className="wrap"><ErrorNote error={error} /></div>;
  const room = h.rooms.find((r) => String(r.id) === roomId);
  if (!room) return <div className="wrap"><ErrorNote error={{ message: 'That room does not exist.' }} /></div>;
  const nights = nightsBetween(stay.check_in, stay.check_out);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await api('/reservations', { method: 'POST', body: { ...form, room_type_id: room.id, ...stay } });
      const saved = JSON.parse(localStorage.getItem('staywell.trips') || '[]');
      localStorage.setItem('staywell.trips', JSON.stringify([r, ...saved].slice(0, 10)));
      navigate(`/trips/${r.code}?email=${encodeURIComponent(r.email)}&new=1`);
    } catch (e2) {
      setErr(e2);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap book">
      <form className="book__form" onSubmit={submit}>
        <p className="eyebrow eyebrow--dark">Almost there</p>
        <h1 className="title">Who's checking in?</h1>
        <label className="field"><span>Full name</span>
          <input className="input" required placeholder="Noor Haddad" value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} /></label>
        <label className="field"><span>Email for the confirmation</span>
          <input className="input" type="email" required placeholder="noor.haddad@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <p className="muted small">Free cancellation until 48 hours before check-in. This is a demo — nothing is charged.</p>
        {err && <ErrorNote error={err} />}
        <button className="btn btn--solid btn--block" disabled={busy}>{busy ? 'Confirming…' : `Confirm reservation · ${money(room.total_cents)}`}</button>
        <Link to={`/hotels/${slug}?${stayQuery(stay)}`} className="link">← Choose a different room</Link>
      </form>
      <aside className="summary">
        <div className="summary__img" style={{ backgroundImage: `url(${room.image})` }} />
        <div className="summary__body">
          <h3>{h.name}</h3>
          <p className="muted">{room.name} · {room.bed}</p>
          <dl>
            <div><dt>Check in</dt><dd>{pretty(stay.check_in)}</dd></div>
            <div><dt>Check out</dt><dd>{pretty(stay.check_out)}</dd></div>
            <div><dt>Guests</dt><dd>{stay.guests}</dd></div>
            <div><dt>{money(room.nightly_cents)} × {nights} nights</dt><dd>{money(room.subtotal_cents)}</dd></div>
            <div><dt>Taxes & fees</dt><dd>{money(room.taxes_cents)}</dd></div>
            <div className="summary__total"><dt>Total</dt><dd>{money(room.total_cents)}</dd></div>
          </dl>
        </div>
      </aside>
    </div>
  );
}
