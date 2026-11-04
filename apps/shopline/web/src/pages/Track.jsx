import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { money } from '../api.js';
import { useApi } from '../useApi.js';
import { ErrorNote, Loading } from '../components/Status.jsx';

const STAGES = ['placed', 'packed', 'shipped', 'delivered'];

function OrderView({ number, email, isNew }) {
  const { data: o, error, loading } = useApi(`/orders/${encodeURIComponent(number)}?email=${encodeURIComponent(email)}`);
  if (loading) return <Loading label="Finding your order" />;
  if (error) return <ErrorNote error={error} />;
  const stage = STAGES.indexOf(o.status);

  return (
    <div className="order">
      {isNew && <div className="note note--ok">Thank you, {o.full_name.split(' ')[0]} — your order is confirmed.</div>}
      <div className="order__head">
        <div>
          <p className="eyebrow eyebrow--dark">Order</p>
          <h2 className="order__num">{o.number}</h2>
          <p className="order__meta">Placed {new Date(o.created_at).toLocaleString()} · {o.email}</p>
        </div>
        <span className="order__status">{o.status}</span>
      </div>
      <ol className="steps">
        {STAGES.map((s, i) => <li key={s} className={i <= stage ? 'is-done' : ''}>{s}</li>)}
      </ol>
      {o.items.map((i) => (
        <div className="mini" key={i.product_id}>
          <img src={i.image} alt="" />
          <span>{i.name} × {i.qty}</span>
          <span>{money(i.price_cents * i.qty)}</span>
        </div>
      ))}
      <div className="summary__row"><span>Shipping</span><span>{o.shipping_cents ? money(o.shipping_cents) : 'Free'}</span></div>
      <div className="summary__row summary__row--total"><span>Total</span><span>{money(o.total_cents)}</span></div>
      <p className="order__ship">Shipping to {o.full_name}, {o.address}, {o.city} {o.postal_code}, {o.country}</p>
    </div>
  );
}

export default function Track() {
  const { number } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ number: '', email: '' });
  const recent = JSON.parse(localStorage.getItem('shopline.orders') || '[]');

  return (
    <div className="page page--narrow">
      <header className="page__head">
        <p className="eyebrow eyebrow--dark">Orders</p>
        <h1 className="page__title">Track an order</h1>
      </header>

      {number ? (
        <>
          <OrderView number={number} email={params.get('email') || ''} isNew={params.get('new') === '1'} />
          <p><Link to="/orders" className="btn btn--link-dark">← Track another order</Link></p>
        </>
      ) : (
        <>
          <form
            className="form form--inline"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`/orders/${encodeURIComponent(form.number.trim())}?email=${encodeURIComponent(form.email.trim())}`);
            }}
          >
            <input className="input" required placeholder="Order number (e.g. SL-10042)" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
            <input className="input" required type="email" placeholder="Email used at checkout" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <button className="btn btn--solid">Find order</button>
          </form>
          <p className="form__note">Try the sample order <strong>SL-10042</strong> with <strong>ava.chen@example.com</strong>.</p>
          {recent.length > 0 && (
            <div className="recent">
              <h3>Your recent orders</h3>
              {recent.map((r) => (
                <Link key={r.number} to={`/orders/${r.number}?email=${encodeURIComponent(r.email)}`}>{r.number}</Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
