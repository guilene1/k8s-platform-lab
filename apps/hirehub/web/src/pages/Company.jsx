import { Link, useParams } from 'react-router';
import { useApi } from '../useApi.js';
import JobRow from '../components/JobRow.jsx';
import { ErrorNote, Loading } from '../components/Status.jsx';

export default function Company() {
  const { slug } = useParams();
  const { data: c, error, loading } = useApi(`/companies/${slug}`);
  if (loading) return <div className="wrap"><Loading /></div>;
  if (error) return <div className="wrap"><ErrorNote error={error} /></div>;
  return (
    <>
      <section className="cover" style={{ backgroundImage: `url(${c.image})` }}>
        <div className="hero__shade" />
        <div className="cover__content">
          <Link to="/jobs" className="back back--light">← All jobs</Link>
          <p className="kicker">{c.industry} · {c.location} · {c.size}</p>
          <h1 className="cover__title">{c.name}</h1>
          <p className="hero__lede">{c.tagline}</p>
        </div>
      </section>
      <div className="wrap company-page">
        <div>
          <p className="lede">{c.about}</p>
          <h3>Perks</h3>
          <ul className="ticks">{c.perks.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
        <div>
          <h2 className="h2">{c.jobs.length} open role{c.jobs.length === 1 ? '' : 's'}</h2>
          <div className="joblist">{c.jobs.map((j) => <JobRow key={j.slug} job={j} />)}</div>
        </div>
      </div>
    </>
  );
}
