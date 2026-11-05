import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { api, money } from '../api.js';
import { useApi } from '../useApi.js';
import { pretty, rentalFrom, rq } from '../dates.js';
import Search from '../components/Search.jsx';
import { ErrorNote, Loading } from '../components/Status.jsx';

export default function Car() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const r = rentalFrom(params);
  const navigate = useNavigate();
  const { data: v, error, loading } = useApi(`/vehicles/${slug}?${rq(r)}`);
  const [form, setForm] = useState({ driver_name: '', email: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  if (loading) return <div className="wrap"><Loading /></div>;
  if (error) return <div className="wrap"><ErrorNote error={error} /></div>;

  async function book(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const b = await api('/bookings', { method: 'POST', body: { ...form, vehicle: slug, pickup: r.pickup, return: r.return } });
      navigate(`/bookings/${b.code}?email=${encodeURIComponent(b.email)}&new=1`);
    } catch (e2) {
      setErr(e2);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="cover" style={{ backgroundImage: `url(${v.photo})` }}>
        <div className="hero__shade" />
        <div className="cover__content">
          <Link to={`/fleet?${rq(r)}`} className="back">← The fleet</Link>
          <p className="tag">{v.category} · {v.year}</p>
          <h1 className="cover__title">{v.name}</h1>
          <p className="cover__lede">{v.blurb}</p>
        </div>
      </section>
      <div className="wrap detail">
        <div>
          <dl className="specs">
            <div><dt>Seats</dt><dd>{v.seats}</dd></div>
            <div><dt>Gearbox</dt><dd>{v.transmission}</dd></div>
            <div><dt>Fuel</dt><dd>{v.fuel}</dd></div>
            <div><dt>Odometer</dt><dd>{v.odometer_km.toLocaleString()} km</dd></div>
          </dl>
          <ul className="feat">{v.features.map((f) => <li key={f}>{f}</li>)}</ul>
          <h3>Pick up &amp; return</h3>
          <p><strong>{v.location_name}</strong> — {v.address}, {v.city}<br /><span className="muted">{v.hours}</span></p>
          {v.booked.length > 0 && (
            <>
              <h3>Already booked</h3>
              <ul className="booked">{v.booked.map((b) => <li key={b.pickup}>{pretty(b.pickup)} → {pretty(b.return)}</li>)}</ul>
            </>
          )}
        </div>
        <aside className="bookbox">
          <Search key={params.toString()} initial={{ ...r, location: '' }} inline to={`/cars/${slug}`} />
          {v.available === false ? <p className="warn">Booked for those dates — try different ones.</p> : (
            <form onSubmit={book} className="bookbox__form">
              <div className="line"><span>{money(v.daily_cents)} × {v.rental.days} days</span><span>{money(v.base_cents)}</span></div>
              {v.discount_cents > 0 && <div className="line line--save"><span>Weekly rate −10%</span><span>−{money(v.discount_cents)}</span></div>}
              <div className="line line--total"><span>Total</span><span>{money(v.total_cents)}</span></div>
              <input className="input" required placeholder="Driver's full name" value={form.driver_name} onChange={(e) => setForm({ ...form, driver_name: e.target.value })} />
              <input className="input" required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              {err && <ErrorNote error={err} />}
              <button className="btn btn--solid btn--block" disabled={busy}>{busy ? 'Reserving…' : 'Reserve this car'}</button>
            </form>
          )}
        </aside>
      </div>
    </>
  );
}
