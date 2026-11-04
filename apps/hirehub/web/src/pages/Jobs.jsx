import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useApi } from '../useApi.js';
import JobRow from '../components/JobRow.jsx';
import { ErrorNote, Loading } from '../components/Status.jsx';

export default function Jobs() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const { data, error, loading } = useApi(`/jobs?${params}`);
  const set = (k, v) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v); else n.delete(k);
    setParams(n);
  };

  return (
    <div className="wrap">
      <h1 className="h1">Open roles</h1>
      <form className="toolbar" onSubmit={(e) => { e.preventDefault(); set('q', q.trim()); }}>
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, team or company" />
        <div className="seg">
          {['', 'remote', 'hybrid', 'onsite'].map((w) => (
            <button type="button" key={w || 'any'} className={(params.get('workplace') || '') === w ? 'is-on' : ''} onClick={() => set('workplace', w)}>{w || 'Anywhere'}</button>
          ))}
        </div>
        <select className="input input--auto" value={params.get('level') || ''} onChange={(e) => set('level', e.target.value)}>
          <option value="">Any level</option>
          {['junior', 'mid', 'senior', 'lead'].map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </form>
      {loading && <Loading label="Fetching roles" />}
      {error && <ErrorNote error={error} />}
      {data?.length === 0 && <p className="muted">No roles match. Try widening the search.</p>}
      <div className="joblist">{data?.map((j) => <JobRow key={j.slug} job={j} />)}</div>
    </div>
  );
}
