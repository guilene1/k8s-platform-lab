import { useState } from 'react';
import { Link } from 'react-router';
import { money } from '../api.js';
import { useCart } from '../cart.jsx';
import { ErrorNote, Loading } from '../components/Status.jsx';

export default function Bag() {
  const { cart, error, setQty } = useCart();
  const [itemError, setItemError] = useState(null);

  if (error && !cart) return <div className="page"><ErrorNote error={error} /></div>;
  if (!cart) return <div className="page"><Loading label="Opening your bag" /></div>;

  const update = (id, qty) => setQty(id, qty).then(() => setItemError(null)).catch((e) => setItemError(e.message));
  const remaining = cart.free_shipping_threshold_cents - cart.subtotal_cents;

  return (
    <div className="page page--narrow">
      <header className="page__head">
        <p className="eyebrow eyebrow--dark">Your bag</p>
        <h1 className="page__title">{cart.count ? `${cart.count} item${cart.count > 1 ? 's' : ''}` : 'Your bag is empty'}</h1>
      </header>

      {cart.count === 0 && (
        <p className="empty">Nothing here yet. <Link to="/shop">Start with the edit →</Link></p>
      )}

      {itemError && <div className="note note--err">{itemError}</div>}

      {cart.items.map((i) => (
        <div className="line" key={i.id}>
          <img src={i.image} alt="" className="line__img" />
          <div className="line__info">
            <Link to={`/p/${i.slug}`} className="line__name">{i.name}</Link>
            <span className="line__meta">{i.category_name} · {money(i.price_cents)}</span>
            <div className="qty qty--sm">
              <button onClick={() => update(i.id, i.qty - 1)} aria-label="Decrease">−</button>
              <span>{i.qty}</span>
              <button onClick={() => update(i.id, i.qty + 1)} aria-label="Increase">+</button>
            </div>
          </div>
          <div className="line__right">
            <span className="line__total">{money(i.price_cents * i.qty)}</span>
            <button className="btn btn--link-dark" onClick={() => update(i.id, 0)}>Remove</button>
          </div>
        </div>
      ))}

      {cart.count > 0 && (
        <div className="summary">
          {remaining > 0 && <p className="summary__hint">Add {money(remaining)} more for free shipping.</p>}
          <div className="summary__row"><span>Subtotal</span><span>{money(cart.subtotal_cents)}</span></div>
          <div className="summary__row"><span>Shipping</span><span>{cart.shipping_cents ? money(cart.shipping_cents) : 'Free'}</span></div>
          <div className="summary__row summary__row--total"><span>Total</span><span>{money(cart.total_cents)}</span></div>
          <Link to="/checkout" className="btn btn--solid btn--block">Checkout</Link>
        </div>
      )}
    </div>
  );
}
