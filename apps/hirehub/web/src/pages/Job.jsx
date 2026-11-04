import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api } from '../api.js';
import { useApi } from '../useApi.js';
import { ago, salary } from '../components/JobRow.jsx';
import { ErrorNote, Loading } from '../components/Status.jsx';

function Apply({ job }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', portfolio_url: '', cover_note: '' });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v));
    if (file) data.append('resume', file);
    setBusy(true);
    setError(null);
    try {
      const r = await api(`/jobs/${job.slug}/apply`, { method: 'POST', form: data });
      navigate(`/status/${r.code}?email=${encodeURIComponent(r.email)}&new=1`);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="apply" onSubmit={submit}>
      <h3>Apply for this role</h3>
      <input className="input" required placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      <input className="input" required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <input className="input" placeholder="Portfolio, GitHub or LinkedIn (optional)" value={form.portfolio_url} onChange={(e) => setForm({ ...form, portfolio_url: e.target.value })} />
      <textarea className="input" rows={4} placeholder="Why this role? (optional)" value={form.cover_note} onChange={(e) => setForm({ ...form, cover_note: e.target.value })} />
      <label className={`drop ${file ? 'has-file' : ''}`}>
        <input type="file" required accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => setFile(e.target.files[0] || null)} />
        <span>{file ? `📄 ${file.name} (${Math.ceil(file.size / 1024)} KB)` : 'Attach your resume — PDF, DOC or DOCX, max 5 MB'}</span>
      </label>
      <p className="muted small">Resumes are stored on shared storage (Amazon EFS), so any replica of our API can hand them to the hiring team.</p>
      {error && <ErrorNote error={error} />}
      <button className="btn btn--solid btn--block" disabled={busy}>{busy ? 'Sending…' : 'Submit application'}</button>
    </form>
  );
}

export default function Job() {
  const { slug } = useParams();
  const { data: j, error, loading } = useApi(`/jobs/${slug}`);
  if (loading) return <div className="wrap"><Loading /></div>;
  if (error) return <div className="wrap"><ErrorNote error={error} /></div>;

  return (
    <div className="wrap">
      <Link to="/jobs" className="back">← All jobs</Link>
      <div className="job">
        <article>
          <Link to={`/companies/${j.company_slug}`} className="job__company">
            <span className="jobrow__logo" style={{ backgroundImage: `url(${j.company_image})` }} />{j.company_name}
          </Link>
          <h1 className="h1">{j.title}</h1>
          <div className="job__tags">
            <span className={`pill pill--${j.workplace}`}>{j.workplace}</span>
            <span className="pill">{j.level}</span>
            <span className="pill">{j.employment}</span>
            <span className="pill">{j.location}</span>
          </div>
          <p className="job__pay">{salary(j)} <span className="muted">· posted {ago(j.posted_at).toLowerCase()} · {j.applicants} applicant{j.applicants === 1 ? '' : 's'}</span></p>
          <p className="lede">{j.summary}</p>
          <h3>What you'll do</h3>
          <ul className="ticks">{j.responsibilities.map((r) => <li key={r}>{r}</li>)}</ul>
          <h3>What you'll bring</h3>
          <ul className="ticks">{j.requirements.map((r) => <li key={r}>{r}</li>)}</ul>
          <p className="muted small">Hiring manager? <Link className="link" to={`/hiring/${j.slug}`}>Review applicants (demo) →</Link></p>
        </article>
        <aside><Apply job={j} /></aside>
      </div>
    </div>
  );
}
