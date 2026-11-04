import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApi } from '../useApi.js';
import { addDays, stayQuery, today } from '../dates.js';

export default function SearchBar({ initial, compact }) {
  const navigate = useNavigate();
  const { data: destinations } = useApi('/destinations');
  const [s, setS] = useState({ city: '', ...initial });

  function submit(e) {
    e.preventDefault();
    const q = stayQuery(s);
    navigate(`/stays?${q}${s.city ? `&city=${encodeURIComponent(s.city)}` : ''}`);
  }

  return (
    <form className={`search ${compact ? 'search--compact' : ''}`} onSubmit={submit}>
      <label>
        <span>Where</span>
        <select value={s.city} onChange={(e) => setS({ ...s, city: e.target.value })}>
          <option value="">Anywhere</option>
          {destinations?.map((d) => <option key={d.city} value={d.city}>{d.city}, {d.country}</option>)}
        </select>
      </label>
      <label>
        <span>Check in</span>
        <input type="date" min={today()} value={s.check_in}
          onChange={(e) => {
            const v = e.target.value;
            setS({ ...s, check_in: v, check_out: s.check_out <= v ? addDays(v, 1) : s.check_out });
          }} />
      </label>
      <label>
        <span>Check out</span>
        <input type="date" min={addDays(s.check_in, 1)} value={s.check_out} onChange={(e) => setS({ ...s, check_out: e.target.value })} />
      </label>
      <label>
        <span>Guests</span>
        <select value={s.guests} onChange={(e) => setS({ ...s, guests: Number(e.target.value) })}>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'guest' : 'guests'}</option>)}
        </select>
      </label>
      <button className="btn btn--solid">Search stays</button>
    </form>
  );
}
