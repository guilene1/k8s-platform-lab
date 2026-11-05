import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api, money } from '../api.js';
import { useApi } from '../useApi.js';
import { when } from '../when.js';
import { ErrorNote, Loading } from '../components/Status.jsx';

const MAX = 8;

export default function Event() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const ev = useApi(`/events/${slug}`);
  const [map, setMap] = useState(null);
  const [picked, setPicked] = useState([]);
  const [form, setForm] = useState({ buyer_name: '', email: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const loadMap = () => api(`/events/${slug}/seats`).then(setMap).catch(setError);
  useEffect(() => { loadMap(); }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  if (ev.loading) return <div className="wrap"><Loading /></div>;
  if (ev.error) return <div className="wrap"><ErrorNote error={ev.error} /></div>;
  const e = ev.data;
  const w = when(e.starts_at, e.timezone);

  const priceOf = (id) => map?.rows.find((r) => r.row === id[0])?.price_cents || 0;
  const subtotal = picked.reduce((s, id) => s + priceOf(id), 0);
  const fees = (map?.fee_cents || 0) * picked.length;
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX ? p : [...p, id]));

  async function buy(ev2) {
    ev2.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api(`/events/${slug}/purchase`, { method: 'POST', body: { ...form, seats: picked } });
      navigate(`/tickets/${r.code}?email=${encodeURIComponent(r.email)}&new=1`);
    } catch (err) {
      setError(err);
      if (err.status === 409) { setPicked([]); loadMap(); }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="cover" style={{ backgroundImage: `url(${e.image})` }}>
        <div className="hero__shade" />
        <div className="cover__content">
          <Link to="/" className="back">← All events</Link>
          <p className="mono-tag">{e.genre} · {w.full}</p>
          <h1 className="mega">{e.artist}</h1>
          <p className="cover__sub">{e.title} — {e.venue_name}, {e.city}</p>
        </div>
      </section>

      <div className="wrap event">
        <div>
          <p className="lede">{e.description}</p>
          <div className="legend">
            <span><i className="seat seat--front" /> Front {money(e.front_price_cents)}</span>
            <span><i className="seat seat--mid" /> Middle {money(e.mid_price_cents)}</span>
            <span><i className="seat seat--back" /> Back {money(e.back_price_cents)}</span>
            <span><i className="seat seat--sold" /> Sold</span>
          </div>
          <div className="stage">STAGE</div>
          {!map && <Loading label="Loading the seat map" />}
          <div className="seatmap" role="grid" aria-label="Seat map">
            {map?.rows.map((r) => (
              <div key={r.row} className="seatrow" role="row">
                <span className="seatrow__label">{r.row}</span>
                {r.seats.map((s) => {
                  const id = `${r.row}${s.n}`;
                  const on = picked.includes(id);
                  return (
                    <button key={id} role="gridcell" disabled={s.sold} title={`${id} · ${money(r.price_cents)}`}
                      className={`seat seat--${s.sold ? 'sold' : r.tier} ${on ? 'is-on' : ''}`} onClick={() => toggle(id)} aria-pressed={on} aria-label={`Seat ${id}`} />
                  );
                })}
                <span className="seatrow__label">{r.row}</span>
              </div>
            ))}
          </div>
        </div>

        <form className="checkout" onSubmit={buy}>
          <h3>Your seats</h3>
          {picked.length === 0 ? <p className="muted">Tap seats on the map — up to {MAX}.</p> : (
            <ul className="picked">
              {picked.map((id) => <li key={id}><span className="mono">{id}</span><span>{money(priceOf(id))}</span><button type="button" onClick={() => toggle(id)} aria-label={`Remove ${id}`}>×</button></li>)}
            </ul>
          )}
          <div className="sum"><span>Tickets</span><span>{money(subtotal)}</span></div>
          <div className="sum"><span>Fees ({money(map?.fee_cents || 0)} each)</span><span>{money(fees)}</span></div>
          <div className="sum sum--total"><span>Total</span><span>{money(subtotal + fees)}</span></div>
          <input className="input" required placeholder="Name on tickets" value={form.buyer_name} onChange={(x) => setForm({ ...form, buyer_name: x.target.value })} />
          <input className="input" required type="email" placeholder="Email for your tickets" value={form.email} onChange={(x) => setForm({ ...form, email: x.target.value })} />
          {error && <ErrorNote error={error} />}
          <button className="btn btn--solid btn--block" disabled={!picked.length || busy}>{busy ? 'Locking in seats…' : `Buy ${picked.length || ''} ticket${picked.length === 1 ? '' : 's'}`}</button>
          <p className="muted small">Demo — no payment is taken.</p>
        </form>
      </div>
    </>
  );
}
