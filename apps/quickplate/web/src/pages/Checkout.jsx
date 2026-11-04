import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, money } from '../api.js';
import { useBasket } from '../basket.jsx';
import { ErrorNote } from '../components/Status.jsx';

const TIPS = [0, 200, 400, 600];

export default function Checkout() {
  const { basket, lines, subtotal, setQty, clear } = useBasket();
  const navigate = useNavigate();
  const [form, setForm] = useState({ customer_name: '', address: '', notes: '' });
  const [tip, setTip] = useState(400);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (!lines.length) {
    return (
      <div className="wrap narrow">
        <h1 className="big">Your basket is empty.</h1>
        <p className="muted">Pick a kitchen and add a few things first.</p>
        <Link to="/" className="btn btn--solid">Browse restaurants</Link>
      </div>
    );
  }

  const r = basket.restaurant;
  const service = Math.round(subtotal * 0.08);
  const total = subtotal + r.delivery_fee_cents + service + tip;
  const short = subtotal < r.min_order_cents;

  async function place(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { code } = await api('/orders', {
        method: 'POST',
        body: { ...form, restaurant: r.slug, tip_cents: tip, items: lines.map((l) => ({ id: l.id, qty: l.qty })) },
      });
      clear();
      navigate(`/track/${code}`);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap checkout">
      <form className="checkout__form" onSubmit={place}>
        <p className="tag tag--dark">Checkout</p>
        <h1 className="big">Where are we headed?</h1>
        <label className="field"><span>Your name</span>
          <input required className="input" placeholder="Riley Chen" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></label>
        <label className="field"><span>Delivery address</span>
          <input required className="input" placeholder="220 Valencia St, Apt 4" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
        <label className="field"><span>Notes for the courier</span>
          <input className="input" placeholder="Buzzer 4, leave at the door" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
        <div className="field"><span>Tip your courier</span>
          <div className="tips">
            {TIPS.map((t) => (
              <button type="button" key={t} className={`tip ${tip === t ? 'is-on' : ''}`} onClick={() => setTip(t)}>{t ? money(t) : 'No tip'}</button>
            ))}
          </div>
        </div>
        <p className="muted small">Demo only — no payment is taken and nothing is delivered.</p>
        {error && <ErrorNote error={error} />}
        <button className="btn btn--solid btn--block" disabled={busy || short}>{busy ? 'Sending to the kitchen…' : `Place order · ${money(total)}`}</button>
      </form>

      <aside className="receipt-card">
        <div className="receipt-card__img" style={{ backgroundImage: `url(${r.image})` }} />
        <h3>{r.name}</h3>
        {lines.map((l) => (
          <div key={l.id} className="rline">
            <div className="stepper stepper--sm">
              <button type="button" onClick={() => setQty(l.id, l.qty - 1)}>−</button>
              <span>{l.qty}</span>
              <button type="button" onClick={() => setQty(l.id, l.qty + 1)}>+</button>
            </div>
            <span className="rline__name">{l.name}</span>
            <span>{money(l.qty * l.price_cents)}</span>
          </div>
        ))}
        <div className="rline rline--sum"><span>Subtotal</span><span>{money(subtotal)}</span></div>
        <div className="rline rline--sum"><span>Delivery</span><span>{money(r.delivery_fee_cents)}</span></div>
        <div className="rline rline--sum"><span>Service (8%)</span><span>{money(service)}</span></div>
        <div className="rline rline--sum"><span>Tip</span><span>{money(tip)}</span></div>
        <div className="rline rline--total"><span>Total</span><span>{money(total)}</span></div>
        {short && <p className="warn">Minimum order is {money(r.min_order_cents)}.</p>}
      </aside>
    </div>
  );
}
