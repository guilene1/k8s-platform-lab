import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../api.js';
import { ErrorNote, Loading } from '../components/Status.jsx';

const STATUSES = ['received', 'reviewing', 'interview', 'offer', 'declined'];

// Demo hiring-team view. A real product would sit behind a login.
export default function Hiring() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const load = () => api(`/hiring/jobs/${slug}/applications`).then(setData).catch(setError);
  useEffect(() => { load(); }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  async function move(code, status) {
    try { await api(`/hiring/applications/${code}`, { method: 'PATCH', body: { status } }); load(); } catch (e) { setError(e); }
  }

  if (error) return <div className="wrap"><ErrorNote error={error} /></div>;
  if (!data) return <div className="wrap"><Loading /></div>;
  return (
    <div className="wrap">
      <Link to={`/jobs/${slug}`} className="back">← Job post</Link>
      <p className="kicker kicker--dark">Hiring team · demo view</p>
      <h1 className="h1">{data.job.title}</h1>
      <p className="muted">{data.applications.length} applicant{data.applications.length === 1 ? '' : 's'} · resumes are served from shared EFS storage by any API replica</p>
      <div className="applicants">
        {data.applications.length === 0 && <p className="muted">No applications yet.</p>}
        {data.applications.map((a) => (
          <article key={a.code} className="applicant">
            <div className="applicant__top">
              <div>
                <strong>{a.full_name}</strong>
                <span className="muted"> · {a.email} · {a.code}</span>
              </div>
              <select className="input input--auto" value={a.status} onChange={(e) => move(a.code, e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {a.cover_note && <p>“{a.cover_note}”</p>}
            <div className="applicant__foot">
              <a className="btn btn--ghost-dark" href={a.resume_url}>⬇ {a.resume_name} ({Math.ceil(a.resume_bytes / 1024)} KB)</a>
              {a.portfolio_url && <a className="link" href={a.portfolio_url} target="_blank" rel="noreferrer">Portfolio ↗</a>}
              <span className="muted small">received by {a.received_by}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
