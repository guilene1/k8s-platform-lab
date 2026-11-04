import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useApi } from '../useApi.js';
import JobRow from '../components/JobRow.jsx';
import { ErrorNote, Loading } from '../components/Status.jsx';

export default function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const jobs = useApi('/jobs');
  const companies = useApi('/companies');

  return (
    <>
      <section className="hero" style={{ backgroundImage: 'url(/images/hero.jpg)' }}>
        <div className="hero__shade" />
        <div className="hero__content">
          <p className="kicker">{jobs.data?.length ?? '—'} open roles · {companies.data?.length ?? '—'} companies hiring now</p>
          <h1 className="hero__title">Work that<br /><span>works for you.</span></h1>
          <p className="hero__lede">Real salaries on every listing, no recruiter spam, and you hear back — every time.</p>
          <form className="hero__search" onSubmit={(e) => { e.preventDefault(); navigate(`/jobs?q=${encodeURIComponent(q)}`); }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Platform engineer, designer, analyst…" aria-label="Search jobs" />
            <button className="btn btn--ghost">Search jobs</button>
          </form>
        </div>
      </section>

      <section className="wrap">
        <div className="head">
          <h2 className="h2">Fresh this week</h2>
          <Link to="/jobs" className="btn btn--ghost-dark">All jobs</Link>
        </div>
        {jobs.loading && <Loading label="Fetching roles" />}
        {jobs.error && <ErrorNote error={jobs.error} />}
        <div className="joblist">{jobs.data?.slice(0, 6).map((j) => <JobRow key={j.slug} job={j} />)}</div>
      </section>

      <section className="wrap">
        <h2 className="h2">Companies hiring</h2>
        <div className="companies">
          {companies.data?.map((c) => (
            <Link key={c.slug} to={`/companies/${c.slug}`} className="company">
              <span className="company__img" style={{ backgroundImage: `url(${c.image})` }} />
              <span className="company__body">
                <strong>{c.name}</strong>
                <span>{c.tagline}</span>
                <small>{c.industry} · {c.location} · {c.open_jobs} open</small>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
