import { Link, useParams, useSearchParams } from 'react-router';
import { money } from '../api.js';
import { useApi } from '../useApi.js';
import { nightsBetween, pretty, stayFrom, stayQuery } from '../dates.js';
import SearchBar from '../components/SearchBar.jsx';
import { ErrorNote, Loading } from '../components/Status.jsx';

export default function Hotel() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const stay = stayFrom(params);
  const q = stayQuery(stay);
  const { data: h, error, loading } = useApi(`/hotels/${slug}?${q}`);
  if (loading) return <div className="wrap"><Loading /></div>;
  if (error) return <div className="wrap"><ErrorNote error={error} /></div>;
  const nights = nightsBetween(stay.check_in, stay.check_out);

  return (
    <>
      <section className="cover" style={{ backgroundImage: `url(${h.image})` }}>
        <div className="cover__shade" />
        <div className="cover__content">
          <Link to={`/stays?${q}`} className="back">← All stays</Link>
          <p className="eyebrow">{'★'.repeat(h.stars)} · {h.city}, {h.country}</p>
          <h1 className="cover__title">{h.name}</h1>
          <p className="cover__lede">{h.summary}</p>
        </div>
      </section>

      <div className="wrap hotel">
        <div className="hotel__about">
          <p className="lead">{h.description}</p>
          <div className="score"><strong>{h.rating.toFixed(1)}</strong><span>Exceptional · {h.review_count.toLocaleString()} reviews</span></div>
          <ul className="amenities">{h.amenities.map((a) => <li key={a}>{a}</li>)}</ul>
        </div>
        <aside className="hotel__search">
          <h3>Your stay</h3>
          <p className="muted">{pretty(stay.check_in)} → {pretty(stay.check_out)} · {nights} night{nights > 1 ? 's' : ''}</p>
          <SearchBar key={params.toString()} initial={{ ...stay, city: h.city }} compact />
        </aside>
      </div>

      <section className="wrap">
        <h2 className="title">Choose your room</h2>
        <div className="rooms">
          {h.rooms.map((r) => {
            const fits = stay.guests <= r.max_guests;
            const free = r.available ?? r.inventory;
            return (
              <article key={r.id} className="room">
                <div className="room__img" style={{ backgroundImage: `url(${r.image})` }} />
                <div className="room__body">
                  <h3>{r.name}</h3>
                  <p className="muted">{r.bed} · up to {r.max_guests} guests · {r.size_m2} m²</p>
                  <ul className="features">{r.features.map((f) => <li key={f}>{f}</li>)}</ul>
                  <div className="room__foot">
                    <div>
                      <span className="price">{money(r.nightly_cents)}</span><span className="muted"> / night</span>
                      {r.total_cents && <div className="muted small">{money(r.total_cents)} total incl. taxes</div>}
                    </div>
                    {!fits ? <span className="avail avail--none">Sleeps {r.max_guests}</span>
                      : free < 1 ? <span className="avail avail--none">Fully booked</span>
                      : <Link to={`/book/${h.slug}/${r.id}?${q}`} className="btn btn--solid">Reserve</Link>}
                  </div>
                  {fits && free > 0 && free <= 2 && <span className="avail">Only {free} left for these dates</span>}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
