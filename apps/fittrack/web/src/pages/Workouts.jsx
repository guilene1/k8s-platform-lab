import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { api } from '../api.js';
import { TYPES, dateShort, duration, pace } from '../fmt.js';
import { ErrorNote, Loading } from '../components/Status.jsx';

export default function Workouts() {
  const [params, setParams] = useSearchParams();
  const type = params.get('type') || '';
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(null);

  const load = () => api(`/workouts?limit=60${type ? `&type=${type}` : ''}`).then(setRows).catch(setError);
  useEffect(() => { setRows(null); load(); }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  async function remove(id) {
    if (!window.confirm('Delete this workout?')) return;
    try { await api(`/workouts/${id}`, { method: 'DELETE' }); load(); } catch (e) { setError(e); }
  }

  return (
    <div className="wrap">
      <h1 className="h1">Workouts</h1>
      <div className="filters">
        <button className={!type ? 'is-on' : ''} onClick={() => setParams({})}>All</button>
        {Object.entries(TYPES).map(([k, v]) => <button key={k} className={type === k ? 'is-on' : ''} onClick={() => setParams({ type: k })}>{v.label}</button>)}
      </div>
      {error && <ErrorNote error={error} />}
      {!rows && !error && <Loading />}
      {rows?.length === 0 && <p className="muted">No {type || ''} workouts yet.</p>}
      <div className="wlist">
        {rows?.map((w) => (
          <article key={w.id} className={`wrow ${open === w.id ? 'is-open' : ''}`}>
            <button className="wrow__main" onClick={() => setOpen(open === w.id ? null : w.id)}>
              <span className={`badge badge--${w.type}`}>{TYPES[w.type]?.label}</span>
              <span className="wrow__title">{w.title}<small>{dateShort(w.started_at)}</small></span>
              <span className="wrow__stat"><strong>{duration(w.duration_s)}</strong>time</span>
              <span className="wrow__stat"><strong>{w.distance_km ?? '—'}</strong>km</span>
              <span className="wrow__stat hide-sm"><strong>{pace(w.pace_s_per_km)}</strong>pace</span>
              <span className="wrow__stat hide-sm"><strong>{w.calories}</strong>kcal</span>
            </button>
            {open === w.id && (
              <div className="wrow__detail">
                <span>Elevation {w.elevation_m} m</span>
                <span>Avg HR {w.avg_hr ?? '—'} bpm</span>
                <span>Effort {w.effort}/10</span>
                {w.notes && <p>“{w.notes}”</p>}
                <button className="btn btn--text" onClick={() => remove(w.id)}>Delete</button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
