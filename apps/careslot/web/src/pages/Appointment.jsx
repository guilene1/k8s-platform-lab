import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { api } from '../api.js';
import { useApi } from '../useApi.js';
import { ErrorNote, Loading } from '../components/Status.jsx';

function Card({ code, email, isNew }) {
  const { data, error, loading } = useApi(`/appointments/${code}?email=${encodeURIComponent(email)}`);
  const [override, setOverride] = useState(null);
  const [err, setErr] = useState(null);
  const a = override || data;
  if (loading) return <Loading label="Finding your appointment" />;
  if (error) return <ErrorNote error={error} />;

  async function cancel() {
    if (!window.confirm('Cancel this appointment?')) return;
    try { setOverride(await api(`/appointments/${code}/cancel`, { method: 'POST', body: { email } })); } catch (e) { setErr(e); }
  }
  const cancelled = a.status === 'cancelled';

  return (
    <article className={`appt ${cancelled ? 'appt--off' : ''}`}>
      {isNew && !cancelled && <p className="note">You're booked. A reminder will go to {a.email} the day before.</p>}
      <div className="appt__top">
        <span className="appt__photo" style={{ backgroundImage: `url(${a.photo})` }} />
        <div>
          <p className="eyebrow eyebrow--dark">{cancelled ? 'Cancelled' : 'Confirmed'} · {a.code}</p>
          <h2 className="h2">{a.local_label}</h2>
          <p className="muted">{a.doctor_name} · {a.specialty_name} · {a.visit_type === 'video' ? 'Video visit (link sent by email)' : a.clinic}</p>
        </div>
      </div>
      {a.reason && <p>Reason: {a.reason}</p>}
      {err && <ErrorNote error={err} />}
      <div className="appt__actions">
        <Link to={`/doctors/${a.doctor_slug}`} className="btn btn--outline">Book another</Link>
        {!cancelled && <button className="btn btn--text" onClick={cancel}>Cancel appointment</button>}
      </div>
    </article>
  );
}

export default function Appointment() {
  const { code } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [f, setF] = useState({ code: '', email: '' });
  return (
    <div className="wrap narrow">
      <p className="eyebrow eyebrow--dark">My appointment</p>
      {code ? <Card code={code} email={params.get('email') || ''} isNew={params.get('new') === '1'} /> : (
        <>
          <h1 className="h1">Look up an appointment</h1>
          <form className="lookup" onSubmit={(e) => { e.preventDefault(); navigate(`/appointments/${f.code.trim().toUpperCase()}?email=${encodeURIComponent(f.email.trim())}`); }}>
            <input className="input" required placeholder="Code (CS-3107)" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} />
            <input className="input" required type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <button className="btn btn--solid">Find</button>
          </form>
          <p className="muted">Try <strong>CS-3107</strong> with <strong>jamie.ruiz@example.com</strong>.</p>
        </>
      )}
    </div>
  );
}
