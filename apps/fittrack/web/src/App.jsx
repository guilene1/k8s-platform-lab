import { useEffect } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router';
import Home from './pages/Home.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Workouts from './pages/Workouts.jsx';
import Log from './pages/Log.jsx';

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return (
    <>
      <header className={`nav ${pathname === '/' ? 'nav--hero' : ''}`}>
        <Link to="/" className="logo">FIT<span>/</span>TRACK</Link>
        <nav>
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/workouts">Workouts</NavLink>
          <NavLink to="/log" className="nav__log">+ Log</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/workouts" element={<Workouts />} />
          <Route path="/log" element={<Log />} />
          <Route path="*" element={<div className="wrap"><h1 className="h1">Off course.</h1><Link to="/dashboard" className="link">Back to the dashboard →</Link></div>} />
        </Routes>
      </main>
      <footer className="footer">
        <span className="logo logo--small">FIT<span>/</span>TRACK</span>
        <p>Kubernetes Platform Lab demo athlete — data is generated. Photography: CC0, see CREDITS.md.</p>
      </footer>
    </>
  );
}
