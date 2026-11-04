import { useEffect } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router';
import Home from './pages/Home.jsx';
import Doctors from './pages/Doctors.jsx';
import Doctor from './pages/Doctor.jsx';
import Appointment from './pages/Appointment.jsx';

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  const hero = pathname === '/';
  return (
    <>
      <header className={`nav ${hero ? 'nav--hero' : ''}`}>
        <Link to="/" className="brand"><span className="brand__cross">+</span>CareSlot</Link>
        <nav>
          <NavLink to="/doctors">Find a doctor</NavLink>
          <NavLink to="/appointments">My appointment</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/doctors" element={<Doctors />} />
          <Route path="/doctors/:slug" element={<Doctor />} />
          <Route path="/appointments" element={<Appointment />} />
          <Route path="/appointments/:code" element={<Appointment />} />
          <Route path="*" element={<div className="wrap"><h1 className="h1">We couldn't find that page.</h1><Link className="link" to="/doctors">Find a doctor →</Link></div>} />
        </Routes>
      </main>
      <footer className="footer">
        <span className="brand brand--small"><span className="brand__cross">+</span>CareSlot</span>
        <p>Kubernetes Platform Lab demo — not a medical service. In an emergency call your local emergency number. Photography: CC0, see CREDITS.md.</p>
      </footer>
    </>
  );
}
