import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router';
import { api } from './api.js';
import Home from './pages/Home.jsx';
import Listing from './pages/Listing.jsx';
import Saved from './pages/Saved.jsx';
import Sell from './pages/Sell.jsx';

// Shows which API pod answered and what is on the shared EFS volume.
function StorageBadge() {
  const { pathname } = useLocation();
  const [s, setS] = useState(null);
  useEffect(() => { api('/storage').then(setS).catch(() => setS(null)); }, [pathname]);
  if (!s) return null;
  return (
    <span className="storage" title="Photos live on Amazon EFS, shared by every API replica">
      <span className="storage__dot" /> served by <code>{s.served_by}</code> · {s.files} photos on shared storage ({(s.bytes / 1048576).toFixed(1)} MB)
    </span>
  );
}

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  const hero = pathname === '/';
  return (
    <>
      <header className={`nav ${hero ? 'nav--hero' : ''}`}>
        <Link to="/" className="mark"><span>HF</span>HomeFinder</Link>
        <nav>
          <NavLink to="/" end>Buy</NavLink>
          <NavLink to="/saved">Saved</NavLink>
          <NavLink to="/sell" className="nav__cta">List your home</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/homes/:slug" element={<Listing />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/sell" element={<Sell />} />
          <Route path="*" element={<div className="wrap"><h1 className="h1">No such address.</h1><Link to="/" className="link">Browse homes →</Link></div>} />
        </Routes>
      </main>
      <footer className="footer">
        <div><span className="mark mark--small"><span>HF</span>HomeFinder</span></div>
        <StorageBadge />
        <p>Kubernetes Platform Lab demo — listings are fictional. Photography: CC0, see CREDITS.md.</p>
      </footer>
    </>
  );
}
