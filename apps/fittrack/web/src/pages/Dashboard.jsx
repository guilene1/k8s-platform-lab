import { Link } from 'react-router';
import { useApi } from '../useApi.js';
import { TYPES, dateShort, duration, pace } from '../fmt.js';
import { TypeSplit, WeeklyBars } from '../components/Charts.jsx';
import { ErrorNote, Loading } from '../components/Status.jsx';

function Ring({ value, goal, label, unit }) {
  const pct = Math.min(1, value / goal);
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring">
      <svg viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={r} className="ring__track" />
        <circle cx="55" cy="55" r={r} className="ring__fill" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
      </svg>
      <div className="ring__text"><strong>{value}</strong><span>/ {goal} {unit}</span></div>
      <p>{label}</p>
    </div>
  );
}

export default function Dashboard() {
  const a = useApi('/athlete');
  const p = useApi('/progress?weeks=10');
  const recent = useApi('/workouts?limit=6');
  if (a.loading || p.loading) return <div className="wrap"><Loading label="Crunching your splits" /></div>;
  if (a.error || p.error) return <div className="wrap"><ErrorNote error={a.error || p.error} /></div>;
  const athlete = a.data;
  const r = athlete.records;
  const km = Math.round(athlete.this_week.metres / 100) / 10;
  const minutes = Math.round(athlete.this_week.seconds / 60);

  return (
    <div className="wrap">
      <header className="dash-head">
        <div>
          <p className="tag tag--dark">Athlete</p>
          <h1 className="h1">{athlete.full_name}</h1>
        </div>
        <Link to="/log" className="btn btn--solid">+ Log workout</Link>
      </header>

      <div className="grid-3">
        <section className="card card--dark">
          <h3>This week</h3>
          <div className="rings">
            <Ring value={km} goal={athlete.weekly_km_goal} unit="km" label="Distance" />
            <Ring value={minutes} goal={athlete.weekly_minutes_goal} unit="min" label="Time" />
          </div>
          <p className="muted-light">{athlete.this_week.sessions} sessions · {athlete.this_week.calories.toLocaleString()} kcal · {athlete.streak_days}-day streak</p>
        </section>

        <section className="card card--wide">
          <h3>Weekly distance · last 10 weeks</h3>
          <WeeklyBars weeks={p.data.weeks} goal={p.data.goals.km} />
        </section>

        <section className="card">
          <h3>Personal records</h3>
          <ul className="prs">
            {r.longest_run && <li><span>Longest run</span><strong>{(r.longest_run.distance_m / 1000).toFixed(1)} km</strong><small>{r.longest_run.title}</small></li>}
            {r.fastest_pace && <li><span>Fastest 5K+ pace</span><strong>{pace(Math.round(r.fastest_pace.duration_s / (r.fastest_pace.distance_m / 1000)))}</strong><small>{r.fastest_pace.title}</small></li>}
            {r.most_climbing && <li><span>Most climbing</span><strong>{r.most_climbing.elevation_m} m</strong><small>{r.most_climbing.title}</small></li>}
          </ul>
        </section>

        <section className="card card--wide">
          <h3>Recent sessions <Link to="/workouts" className="link small">All →</Link></h3>
          {recent.error && <ErrorNote error={recent.error} />}
          <ul className="sessions">
            {recent.data?.map((w) => (
              <li key={w.id}>
                <span className={`badge badge--${w.type}`}>{TYPES[w.type]?.label}</span>
                <span className="sessions__title">{w.title}<small>{dateShort(w.started_at)}</small></span>
                <span>{duration(w.duration_s)}</span>
                <span>{w.distance_km ? `${w.distance_km} km` : '—'}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card card--full">
          <h3>Time by sport</h3>
          <TypeSplit byType={p.data.by_type} labels={TYPES} />
        </section>

      </div>
    </div>
  );
}
