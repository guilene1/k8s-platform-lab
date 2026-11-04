import { useEffect } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router';
import Home from './pages/Home.jsx';
import Stays from './pages/Stays.jsx';
import Hotel from './pages/Hotel.jsx';
import Book from './pages/Book.jsx';
import Trips from './pages/Trips.jsx';

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  const hero = pathname === '/';
  return (
    <>
      <header className={`nav ${hero ? 'nav--hero' : ''}`}>
        <Link to="/" className="wordmark">Stay<em>well</em></Link>
        <nav className="nav__links">
          <NavLink to="/stays">Stays</NavLink>
          <NavLink to="/trips">My trips</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/stays" element={<Stays />} />
          <Route path="/hotels/:slug" element={<Hotel />} />
          <Route path="/book/:slug/:roomId" element={<Book />} />
          <Route path="/trips" element={<Trips />} />
          <Route path="/trips/:code" element={<Trips />} />
          <Route path="*" element={<div className="wrap"><h1 className="title">This road leads nowhere.</h1><Link className="link" to="/">Back home →</Link></div>} />
        </Routes>
      </main>
      <footer className="footer">
        <span className="wordmark wordmark--small">Stay<em>well</em></span>
        <p>A Kubernetes Platform Lab demo — no rooms are actually reserved. Photography: CC0, see CREDITS.md.</p>
      </footer>
    </>
  );
}
