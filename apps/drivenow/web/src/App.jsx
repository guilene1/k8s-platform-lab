import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router';
import { api } from './api.js';
import Home from './pages/Home.jsx';
import Fleet from './pages/Fleet.jsx';
import Car from './pages/Car.jsx';
import Booking from './pages/Booking.jsx';
import Manage from './pages/Manage.jsx';

function StorageBadge() {
  const { pathname } = useLocation();
  const [s, setS] = useState(null);
  useEffect(() => { api('/storage').then(setS).catch(() => setS(null)); }, [pathname]);
  if (!s) return null;
  return <span className="storage">● vehicle photos served by <code>{s.served_by}</code> from shared EFS · {s.files} files</span>;
}

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return (
    <>
      <header className={`nav ${pathname === '/' ? 'nav--hero' : ''}`}>
        <Link to="/" className="logo">DRIVE<span>NOW</span></Link>
        <nav>
          <NavLink to="/fleet">Fleet</NavLink>
          <NavLink to="/bookings">My booking</NavLink>
          <NavLink to="/manage">Fleet manager</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/fleet" element={<Fleet />} />
          <Route path="/cars/:slug" element={<Car />} />
          <Route path="/bookings" element={<Booking />} />
          <Route path="/bookings/:code" element={<Booking />} />
          <Route path="/manage" element={<Manage />} />
          <Route path="*" element={<div className="wrap"><h1 className="h1">Wrong turn.</h1><Link to="/fleet" className="link">Back to the fleet →</Link></div>} />
        </Routes>
      </main>
      <footer className="footer">
        <span className="logo logo--small">DRIVE<span>NOW</span></span>
        <StorageBadge />
        <p>Kubernetes Platform Lab demo — cars are fictional and can't be rented. Photography: CC0, see CREDITS.md.</p>
      </footer>
    </>
  );
}
