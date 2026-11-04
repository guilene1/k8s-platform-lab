import { Link, useParams } from 'react-router';
import { money } from '../api.js';
import { useApi } from '../useApi.js';
import { useBasket } from '../basket.jsx';
import { ErrorNote, Loading } from '../components/Status.jsx';

export default function Restaurant() {
  const { slug } = useParams();
  const { data: r, error, loading } = useApi(`/restaurants/${slug}`);
  const { basket, lines, subtotal, add, setQty } = useBasket();

  if (loading) return <div className="wrap"><Loading /></div>;
  if (error) return <div className="wrap"><ErrorNote error={error} /></div>;
  const mine = basket.restaurant?.slug === r.slug;
  const other = basket.restaurant && !mine ? basket.restaurant.name : null;

  return (
    <>
      <section className="cover" style={{ backgroundImage: `url(${r.image})` }}>
        <div className="cover__shade" />
        <div className="cover__content">
          <Link to="/" className="back">← All restaurants</Link>
          <h1 className="cover__title">{r.name}</h1>
          <p className="cover__tag">{r.tagline}</p>
          <div className="cover__facts">
            <span>★ {r.rating.toFixed(1)} ({r.review_count.toLocaleString()})</span>
            <span>{r.eta_minutes}–{r.eta_minutes + 10} min</span>
            <span>{r.delivery_fee_cents ? `${money(r.delivery_fee_cents)} delivery` : 'Free delivery'}</span>
            <span>{money(r.min_order_cents)} minimum</span>
          </div>
        </div>
      </section>

      <div className="wrap menu-layout">
        <div className="menu">
          {other && <div className="note">Your basket has items from {other}. Adding from here starts a new basket.</div>}
          {r.sections.map((s) => (
            <section key={s.name} className="menu__section">
              <h2>{s.name}</h2>
              <div className="dishes">
                {s.items.map((i) => {
                  const qty = mine ? basket.items[i.id]?.qty || 0 : 0;
                  return (
                    <div key={i.id} className={`dish ${qty ? 'is-in' : ''}`}>
                      <div className="dish__text">
                        <h3>{i.name} {i.popular && <span className="badge">Popular</span>}</h3>
                        <p>{i.description}</p>
                        <span className="dish__meta">
                          <strong>{money(i.price_cents)}</strong>
                          {i.vegetarian && <span title="Vegetarian">🌿 veg</span>}
                          {i.spicy && <span title="Spicy">🌶 spicy</span>}
                        </span>
                      </div>
                      {qty ? (
                        <div className="stepper">
                          <button onClick={() => setQty(i.id, qty - 1)} aria-label={`Remove one ${i.name}`}>−</button>
                          <span>{qty}</span>
                          <button onClick={() => add(r, i)} aria-label={`Add one ${i.name}`}>+</button>
                        </div>
                      ) : (
                        <button className="add" onClick={() => add(r, i)} aria-label={`Add ${i.name}`}>+</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <aside className="side-basket">
          <h3>Your basket</h3>
          {!mine || !lines.length ? <p className="muted">Add something delicious.</p> : (
            <>
              {lines.map((l) => (
                <div key={l.id} className="side-basket__line"><span>{l.qty}× {l.name}</span><span>{money(l.qty * l.price_cents)}</span></div>
              ))}
              <div className="side-basket__line side-basket__total"><span>Subtotal</span><span>{money(subtotal)}</span></div>
              {subtotal < r.min_order_cents && <p className="muted small">Add {money(r.min_order_cents - subtotal)} more to reach the minimum.</p>}
              <Link to="/checkout" className={`btn btn--solid btn--block ${subtotal < r.min_order_cents ? 'is-disabled' : ''}`}>Go to checkout</Link>
            </>
          )}
        </aside>
      </div>
    </>
  );
}
