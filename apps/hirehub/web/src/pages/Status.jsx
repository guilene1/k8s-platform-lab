import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useApi } from '../useApi.js';
import { ErrorNote, Loading } from '../components/Status.jsx';

const LABEL = { received: 'Received', reviewing: 'In review', interview: 'Interview', offer: 'Offer', declined: 'Not this time' };

function Tracker({ code, email, isNew }) {
  const { data: a, error, loading } = useApi(`/applications/${code}?email=${encodeURIComponent(email)}`);
  if (loading) return <Loading label="Looking it up" />;
  if (error) return <ErrorNote error={error} />;
  const idx = a.stages.indexOf(a.status);
  return (
    <div className="tracker">
      {isNew && <p className="banner">Application sent! Your reference is <strong>{a.code}</strong>.</p>}
      <div className="tracker__head">
        <span className="jobrow__logo" style={{ backgroundImage: `url(${a.company_image})` }} />
        <div>
          <h2 className="h2">{a.title}</h2>
          <p className="muted">{a.company_name} · applied {new Date(a.created_at).toLocaleDateString()} · resume “{a.resume_name}”</p>
        </div>
      </div>
      {a.status === 'declined' ? <p className="banner banner--muted">The team decided not to move forward this time. Thank you for applying.</p> : (
        <ol className="pipeline">
          {a.stages.map((s, i) => <li key={s} className={i <= idx ? 'is-done' : ''}><span>{i + 1}</span>{LABEL[s]}</li>)}
        </ol>
      )}
      <Link className="link" to={`/jobs/${a.job_slug}`}>View the job post →</Link>
    </div>
  );
}

export default function Status() {
  const { code } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [f, setF] = useState({ code: '', email: '' });
  return (
    <div className="wrap narrow">
      <h1 className="h1">Track your application</h1>
      {code ? <Tracker code={code} email={params.get('email') || ''} isNew={params.get('new') === '1'} /> : (
        <>
          <form className="lookup" onSubmit={(e) => { e.preventDefault(); navigate(`/status/${f.code.trim().toUpperCase()}?email=${encodeURIComponent(f.email.trim())}`); }}>
            <input className="input" required placeholder="Reference (HH-2041)" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} />
            <input className="input" required type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <button className="btn btn--solid">Check</button>
          </form>
          <p className="muted">Try <strong>HH-2041</strong> with <strong>amara.nwosu@example.com</strong>.</p>
        </>
      )}
    </div>
  );
}
