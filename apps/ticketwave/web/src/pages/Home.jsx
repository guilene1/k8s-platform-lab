import { useState } from 'react';
import { Link } from 'react-router';
import { money } from '../api.js';
import { useApi } from '../useApi.js';
import { when } from '../when.js';
import { ErrorNote, Loading } from '../components/Status.jsx';

export default function Home() {
  const [genre, setGenre] = useState('');
  const events = useApi(`/events${genre ? `?genre=${encodeURIComponent(genre)}` : ''}`);
  const genres = useApi('/genres');
  const headliner = events.data?.[0];

  return (
    <>
      <section className="hero" style={{ backgroundImage: 'url(/images/hero.jpg)' }}>
        <div className="hero__shade" />
        <div className="hero__content">
          <p className="mono-tag">● On sale now · {events.data?.length ?? '—'} shows</p>
          <h1 className="hero__title">Be in<br /><span>the room.</span></h1>
          <p className="hero__lede">Pick your exact seat, see the full price upfront, and walk in with your phone. Rock to Bach, Brooklyn to the bayou.</p>
          <div className="hero__ctas">
            <a href="#lineup" className="btn btn--ghost">See the lineup</a>
            {headliner && <Link to={`/events/${headliner.slug}`} className="btn btn--text">Next up: {headliner.artist} →</Link>}
          </div>
        </div>
      </section>

      <section className="wrap" id="lineup">
        <div className="genres">
          <button className={!genre ? 'is-on' : ''} onClick={() => setGenre('')}>All</button>
          {genres.data?.map((g) => <button key={g.genre} className={genre === g.genre ? 'is-on' : ''} onClick={() => setGenre(g.genre)}>{g.genre}</button>)}
        </div>
        {events.loading && <Loading label="Soundchecking" />}
        {events.error && <ErrorNote error={events.error} />}
        <div className="lineup">
          {events.data?.map((e) => {
            const w = when(e.starts_at, e.timezone);
            const low = Math.min(e.front_price_cents, e.mid_price_cents, e.back_price_cents);
            return (
              <Link key={e.slug} to={`/events/${e.slug}`} className="ev">
                <div className="ev__img" style={{ backgroundImage: `url(${e.image})` }}>
                  <span className="ev__date"><strong>{w.day}</strong>{w.month}</span>
                  <span className="ev__genre">{e.genre}</span>
                </div>
                <div className="ev__body">
                  <h3>{e.artist}</h3>
                  <p>{e.title}</p>
                  <div className="ev__meta">
                    <span>{e.venue_name}, {e.city}</span>
                    <span>{w.weekday} {w.time}</span>
                  </div>
                  <div className="ev__foot">
                    <span className="mono">from {money(low)}</span>
                    <span className={`left ${e.seats_left < 40 ? 'left--hot' : ''}`}>{e.seats_left} seats left</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
