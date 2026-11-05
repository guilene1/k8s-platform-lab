import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../api.js';
import { TYPES } from '../fmt.js';
import { ErrorNote } from '../components/Status.jsx';

const localNow = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export default function Log() {
  const navigate = useNavigate();
  const [f, setF] = useState({ type: 'run', title: '', started_at: localNow(), duration_min: '45', distance_km: '8', elevation_m: '', avg_hr: '', effort: 6, notes: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/workouts', { method: 'POST', body: { ...f, started_at: new Date(f.started_at).toISOString() } });
      navigate('/dashboard');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap narrow">
      <p className="tag tag--dark">New session</p>
      <h1 className="h1">Log a workout</h1>
      <form className="logform" onSubmit={submit}>
        <div className="typepick">
          {Object.entries(TYPES).map(([k, v]) => (
            <button type="button" key={k} className={f.type === k ? 'is-on' : ''} onClick={() => setF({ ...f, type: k })}>{v.label}</button>
          ))}
        </div>
        <label className="field field--wide"><span>Title</span><input className="input" placeholder="Saturday long run" value={f.title} onChange={set('title')} /></label>
        <label className="field"><span>Start</span><input className="input" type="datetime-local" required value={f.started_at} onChange={set('started_at')} /></label>
        <label className="field"><span>Duration (min)</span><input className="input" type="number" min="1" max="1440" required value={f.duration_min} onChange={set('duration_min')} /></label>
        <label className="field"><span>Distance (km)</span><input className="input" type="number" step="0.01" min="0" value={f.distance_km} onChange={set('distance_km')} /></label>
        <label className="field"><span>Elevation (m)</span><input className="input" type="number" min="0" value={f.elevation_m} onChange={set('elevation_m')} /></label>
        <label className="field"><span>Avg heart rate</span><input className="input" type="number" min="40" max="220" value={f.avg_hr} onChange={set('avg_hr')} /></label>
        <label className="field"><span>Effort: {f.effort}/10</span><input type="range" min="1" max="10" value={f.effort} onChange={set('effort')} /></label>
        <label className="field field--wide"><span>Notes</span><textarea className="input" rows={3} value={f.notes} onChange={set('notes')} placeholder="How did it feel?" /></label>
        {error && <div className="field--wide"><ErrorNote error={error} /></div>}
        <button className="btn btn--solid btn--block field--wide" disabled={busy}>{busy ? 'Saving…' : 'Save workout'}</button>
      </form>
    </div>
  );
}
