import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { money } from '../api.js';
import { useApi } from '../useApi.js';
import { useCart } from '../cart.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { ErrorNote, Loading } from '../components/Status.jsx';

export default function Product() {
  const { slug } = useParams();
  const { data: p, error, loading } = useApi(`/products/${slug}`);
  const { add } = useCart();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  if (loading) return <div className="page"><Loading /></div>;
  if (error) return <div className="page"><ErrorNote error={error} /></div>;

  async function onAdd() {
    setBusy(true);
    setMsg(null);
    try {
      await add(p, qty);
      setMsg({ ok: true, text: `${p.name} is in your bag.` });
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <nav className="crumbs">
        <Link to="/shop">Shop</Link> / <Link to={`/shop/${p.category}`}>{p.category_name}</Link> / <span>{p.name}</span>
      </nav>
      <div className="pdp">
        <div className="pdp__media">
          <img src={p.image} alt={p.name} />
        </div>
        <div className="pdp__info">
          {p.badge && <span className="pdp__badge">{p.badge}</span>}
          <h1 className="pdp__name">{p.name}</h1>
          <p className="pdp__price">{money(p.price_cents)}</p>
          <p className="pdp__desc">{p.description}</p>
          <ul className="pdp__details">
            {p.details.map((d) => <li key={d}>{d}</li>)}
          </ul>
          <div className="pdp__buy">
            <div className="qty">
              <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease quantity">−</button>
              <span>{qty}</span>
              <button onClick={() => setQty(Math.min(p.stock, qty + 1, 20))} aria-label="Increase quantity">+</button>
            </div>
            <button className="btn btn--solid" disabled={busy || p.stock === 0} onClick={onAdd}>
              {p.stock === 0 ? 'Sold out' : busy ? 'Adding…' : 'Add to bag'}
            </button>
          </div>
          <p className="pdp__stock">{p.stock > 0 && p.stock < 10 ? `Only ${p.stock} left` : p.stock > 0 ? 'In stock — ships in 1–2 days' : ''}</p>
          {msg && (
            <div className={`note ${msg.ok ? 'note--ok' : 'note--err'}`}>
              {msg.text}
              {msg.ok && <button className="btn btn--link-dark" onClick={() => navigate('/bag')}>View bag →</button>}
            </div>
          )}
        </div>
      </div>

      {p.related.length > 0 && (
        <section className="section section--flush">
          <h2 className="section__title">You may also like</h2>
          <div className="grid">
            {p.related.map((r) => <ProductCard key={r.id} product={r} />)}
          </div>
        </section>
      )}
    </div>
  );
}
