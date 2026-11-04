import { useEffect } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router';
import Landing from './pages/Landing.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Account from './pages/Account.jsx';
import Transfer from './pages/Transfer.jsx';

function Nav({ landing }) {
  return (
    <header className={`nav ${landing ? 'nav--clear' : ''}`}>
      <div className="nav__inner">
        <Link to="/" className="brand"><span className="brand__mark">N</span>Northbank</Link>
        <nav className="nav__links">
          <NavLink to="/app" end>Overview</NavLink>
          <NavLink to="/app/transfer">Move money</NavLink>
        </nav>
        {landing
          ? <Link to="/app" className="btn btn--ghost btn--sm">Sign in</Link>
          : <span className="nav__user"><span className="avatar">JR</span><span className="nav__name">Jordan Reyes</span></span>}
      </div>
    </header>
  );
}

function NotFound() {
  return (
    <div className="shell">
      <h1 className="display">Nothing to see here.</h1>
      <p className="muted"><Link to="/app" className="link">Back to your accounts →</Link></p>
    </div>
  );
}

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  const landing = pathname === '/';
  return (
    <>
      <Nav landing={landing} />
      <main>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<Dashboard />} />
          <Route path="/app/accounts/:number" element={<Account />} />
          <Route path="/app/transfer" element={<Transfer />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="footer">
        <div className="footer__inner">
          <span className="brand brand--small"><span className="brand__mark">N</span>Northbank</span>
          <span>A Kubernetes Platform Lab demo bank. Not a real financial institution. Photography: CC0, see CREDITS.md.</span>
        </div>
      </footer>
    </>
  );
}
