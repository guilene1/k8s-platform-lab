import { useEffect } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router';
import Home from './pages/Home.jsx';
import Event from './pages/Event.jsx';
import Tickets from './pages/Tickets.jsx';

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return (
    <>
      <header className={`nav ${pathname === '/' ? 'nav--hero' : ''}`}>
        <Link to="/" className="logo">TICKET<span>WAVE</span></Link>
        <nav>
          <NavLink to="/" end>Events</NavLink>
          <NavLink to="/tickets">My tickets</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/events/:slug" element={<Event />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/tickets/:code" element={<Tickets />} />
          <Route path="*" element={<div className="wrap"><h1 className="mega">Show cancelled.</h1><Link className="link" to="/">See what's on →</Link></div>} />
        </Routes>
      </main>
      <footer className="footer">
        <span className="logo logo--small">TICKET<span>WAVE</span></span>
        <p>Kubernetes Platform Lab demo — events are fictional, no tickets are sold. Photography: CC0, see CREDITS.md.</p>
      </footer>
    </>
  );
}
