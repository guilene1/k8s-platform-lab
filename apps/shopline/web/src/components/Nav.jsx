import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router';
import { useCart } from '../cart.jsx';

export default function Nav({ overHero }) {
  const { cart } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const solid = !overHero || scrolled || open;
  const close = () => setOpen(false);

  return (
    <header className={`nav ${solid ? 'nav--solid' : ''}`}>
      <div className="nav__inner">
        <Link to="/" className="nav__logo" onClick={close}>Shop<span>Line</span></Link>
        <button className="nav__toggle" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span /><span />
        </button>
        <nav className={`nav__links ${open ? 'is-open' : ''}`}>
          <NavLink to="/shop" onClick={close}>Shop</NavLink>
          <NavLink to="/shop/bags" onClick={close}>Bags</NavLink>
          <NavLink to="/shop/watches" onClick={close}>Watches</NavLink>
          <NavLink to="/orders" onClick={close}>Track order</NavLink>
          <NavLink to="/bag" className="nav__bag" onClick={close}>
            Bag <span className="nav__count">{cart?.count ?? 0}</span>
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
