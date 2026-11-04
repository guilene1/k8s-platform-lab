import { useEffect } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router';
import Home from './pages/Home.jsx';
import Jobs from './pages/Jobs.jsx';
import Job from './pages/Job.jsx';
import Company from './pages/Company.jsx';
import Status from './pages/Status.jsx';
import Hiring from './pages/Hiring.jsx';

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  const hero = pathname === '/';
  return (
    <>
      <header className={`nav ${hero ? 'nav--hero' : ''}`}>
        <Link to="/" className="logo"><span>H</span>hirehub</Link>
        <nav>
          <NavLink to="/jobs">Jobs</NavLink>
          <NavLink to="/status">Track application</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:slug" element={<Job />} />
          <Route path="/companies/:slug" element={<Company />} />
          <Route path="/status" element={<Status />} />
          <Route path="/status/:code" element={<Status />} />
          <Route path="/hiring/:slug" element={<Hiring />} />
          <Route path="*" element={<div className="wrap"><h1 className="h1">404 — position filled.</h1><Link className="link" to="/jobs">See open roles →</Link></div>} />
        </Routes>
      </main>
      <footer className="footer">
        <span className="logo logo--small"><span>H</span>hirehub</span>
        <p>Kubernetes Platform Lab demo — companies and roles are fictional. Photography: CC0, see CREDITS.md.</p>
      </footer>
    </>
  );
}
