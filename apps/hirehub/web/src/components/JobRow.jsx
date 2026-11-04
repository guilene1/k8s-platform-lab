import { Link } from 'react-router';

export const salary = (j) => `$${Math.round(j.salary_min / 1000)}k – $${Math.round(j.salary_max / 1000)}k`;
export const ago = (iso) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d === 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d} days ago`;
};

export default function JobRow({ job }) {
  return (
    <Link to={`/jobs/${job.slug}`} className="jobrow">
      <span className="jobrow__logo" style={{ backgroundImage: `url(${job.company_image})` }} />
      <span className="jobrow__main">
        <strong>{job.title}</strong>
        <span>{job.company_name} · {job.team}</span>
      </span>
      <span className="jobrow__tags">
        <span className={`pill pill--${job.workplace}`}>{job.workplace}</span>
        <span className="pill">{job.level}</span>
        {job.employment !== 'full-time' && <span className="pill">{job.employment}</span>}
      </span>
      <span className="jobrow__pay">{salary(job)}</span>
      <span className="jobrow__age">{ago(job.posted_at)}</span>
    </Link>
  );
}
