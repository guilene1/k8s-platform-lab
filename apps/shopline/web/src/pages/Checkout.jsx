import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, money } from '../api.js';
import { useCart } from '../cart.jsx';
import { Loading } from '../components/Status.jsx';

const FIELDS = [
  ['email', 'Email', 'email', 'ava.chen@example.com'],
  ['full_name', 'Full name', 'text', 'Ava Chen'],
  ['address', 'Street address', 'text', '18 Harbour Street'],
  ['city', 'City', 'text', 'Seattle'],
  ['postal_code', 'Postal code', 'text', '98101'],
  ['country', 'Country', 'text', 'United States'],
];

export default function Checkout() {
  const { cart, refresh } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState(Object.fromEntries(FIELDS.map(([k]) => [k, ''])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (!cart) return <div className="page"><Loading /></div>;
  if (cart.count === 0) {
    return (
      <div className="page page--narrow">
        <h1 className="page__title">Nothing to check out</h1>
        <p className="empty"><Link to="/shop">Browse the collection →</Link></p>
      </div>
    );
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const order = await api(`/carts/${cart.id}/checkout`, { method: 'POST', body: form });
      const recent = JSON.parse(localStorage.getItem('shopline.orders') || '[]');
      localStorage.setItem('shopline.orders', JSON.stringify([{ number: order.number, email: order.email }, ...recent].slice(0, 10)));
      await refresh();
      navigate(`/orders/${order.number}?email=${encodeURIComponent(order.email)}&new=1`);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="page__head">
        <p className="eyebrow eyebrow--dark">Checkout</p>
        <h1 className="page__title">Where should we send it?</h1>
      </header>
      <div className="checkout">
        <form className="form" onSubmit={submit}>
          {FIELDS.map(([key, label, type, placeholder]) => (
            <label key={key} className={`field ${key === 'email' || key === 'address' ? 'field--wide' : ''}`}>
              <span>{label}</span>
              <input
                className="input"
                type={type}
                required
                placeholder={placeholder}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </label>
          ))}
          <p className="form__note field--wide">This is a demo store — no payment is taken and nothing ships.</p>
          {error && (
            <div className="note note--err field--wide">
              {error.message}
              {error.details?.items && (
                <ul>{error.details.items.map((i) => <li key={i.name}>{i.name}: {i.available} available</li>)}</ul>
              )}
            </div>
          )}
          <button className="btn btn--solid btn--block field--wide" disabled={busy}>
            {busy ? 'Placing order…' : `Place order · ${money(cart.total_cents)}`}
          </button>
        </form>
        <aside className="summary summary--side">
          {cart.items.map((i) => (
            <div className="mini" key={i.id}>
              <img src={i.image} alt="" />
              <span>{i.name} × {i.qty}</span>
              <span>{money(i.price_cents * i.qty)}</span>
            </div>
          ))}
          <div className="summary__row"><span>Subtotal</span><span>{money(cart.subtotal_cents)}</span></div>
          <div className="summary__row"><span>Shipping</span><span>{cart.shipping_cents ? money(cart.shipping_cents) : 'Free'}</span></div>
          <div className="summary__row summary__row--total"><span>Total</span><span>{money(cart.total_cents)}</span></div>
        </aside>
      </div>
    </div>
  );
}
