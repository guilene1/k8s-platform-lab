import { Link } from 'react-router';
import { useApi } from '../useApi.js';
import { TYPES } from '../fmt.js';

export default function Home() {
  const { data: a } = useApi('/athlete');
  return (
    <>
      <section className="hero" style={{ backgroundImage: 'url(/images/hero.jpg)' }}>
        <div className="hero__shade" />
        <div className="hero__content">
          <p className="tag">Training log · Denver, CO</p>
          <h1 className="hero__title">Every mile<br /><span>counts.</span></h1>
          <p className="hero__lede">Log the session, see the week, chase the record. FitTrack turns sweat into numbers you can actually train with.</p>
          <div className="hero__ctas">
            <Link to="/dashboard" className="btn btn--ghost">Open dashboard</Link>
            <Link to="/log" className="btn btn--text">Log a workout →</Link>
          </div>
        </div>
        {a && (
          <div className="hero__stats">
            <div><strong>{(a.this_week.metres / 1000).toFixed(1)}</strong><span>km this week</span></div>
            <div><strong>{a.this_week.sessions}</strong><span>sessions</span></div>
            <div><strong>{a.streak_days}</strong><span>day streak</span></div>
            <div><strong>{a.records.total_workouts}</strong><span>workouts logged</span></div>
          </div>
        )}
      </section>
      <section className="wrap">
        <h2 className="h1">Train every way</h2>
        <div className="types">
          {['run', 'ride', 'intervals', 'trail', 'sprint', 'hills'].map((t) => (
            <Link key={t} to={`/workouts?type=${t}`} className="type" style={{ backgroundImage: `url(${TYPES[t].img})` }}>
              <span>{TYPES[t].label}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
