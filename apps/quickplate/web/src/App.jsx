import { useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router';
import { money } from './api.js';
import { useBasket } from './basket.jsx';
import Home from './pages/Home.jsx';
import Restaurant from './pages/Restaurant.jsx';
import Checkout from './pages/Checkout.jsx';
import Track from './pages/Track.jsx';

function Nav({ overHero }) {
  const { count, subtotal } = useBasket();
  return (
    <header className={`nav ${overHero ? 'nav--hero' : ''}`}>
      <Link to="/" className="logo">quick<span>plate</span></Link>
      <nav className="nav__links">
        <Link to="/#restaurants">Restaurants</Link>
        <Link to="/track">Track order</Link>
      </nav>
      <Link to="/checkout" className={`basket-pill ${count ? 'is-full' : ''}`}>
        <span className="basket-pill__count">{count}</span>
        <span>{count ? money(subtotal) : 'Basket'}</span>
      </Link>
    </header>
  );
}

export default function App() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) document.querySelector(hash)?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <>
      <Nav overHero={pathname === '/'} />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/r/:slug" element={<Restaurant />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/track" element={<Track />} />
          <Route path="/track/:code" element={<Track />} />
          <Route path="*" element={<div className="wrap"><h1 className="big">Lost the plot?</h1><p><Link className="link" to="/">Back to restaurants →</Link></p></div>} />
        </Routes>
      </main>
      <footer className="footer">
        <span className="logo logo--small">quick<span>plate</span></span>
        <span>Demo app for the Kubernetes Platform Lab — nobody is actually coming. Photography: CC0, see CREDITS.md.</span>
      </footer>
    </>
  );
}
