import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApi } from '../useApi.js';
import { addDays, today } from '../dates.js';

export default function Search({ initial, inline, to = '/fleet' }) {
  const navigate = useNavigate();
  const { data: locations } = useApi('/locations');
  const [s, setS] = useState(initial);
  return (
    <form className={`search ${inline ? 'search--inline' : ''}`} onSubmit={(e) => {
      e.preventDefault();
      const q = new URLSearchParams({ pickup: s.pickup, return: s.return });
      if (s.location) q.set('location', s.location);
      navigate(`${to}?${q}`);
    }}>
      <label><span>Pick up at</span>
        <select value={s.location} onChange={(e) => setS({ ...s, location: e.target.value })}>
          <option value="">Any location</option>
          {locations?.map((l) => <option key={l.slug} value={l.slug}>{l.name}, {l.city}</option>)}
        </select></label>
      <label><span>Pick-up date</span>
        <input type="date" min={today()} value={s.pickup} onChange={(e) => {
          const v = e.target.value;
          setS({ ...s, pickup: v, return: s.return <= v ? addDays(v, 1) : s.return });
        }} /></label>
      <label><span>Return date</span>
        <input type="date" min={addDays(s.pickup, 1)} value={s.return} onChange={(e) => setS({ ...s, return: e.target.value })} /></label>
      <button className="btn btn--solid">Find a car</button>
    </form>
  );
}
