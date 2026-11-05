import { Link } from 'react-router';
import { money } from '../api.js';
import { useApi } from '../useApi.js';
import { defaults, rq } from '../dates.js';
import Search from '../components/Search.jsx';

export default function Home() {
  const d = defaults();
  const fleet = useApi('/vehicles');
  const locations = useApi('/locations');
  return (
    <>
      <section className="hero" style={{ backgroundImage: 'url(/images/hero.jpg)' }}>
        <div className="hero__shade" />
        <div className="hero__content">
          <p className="tag">West Coast · {fleet.data?.vehicles.length ?? '—'} cars · 3 garages</p>
          <h1 className="hero__title">Take the<br /><span>long way.</span></h1>
          <p className="hero__lede">Classic cruisers, convertibles and go-anywhere 4×4s — every one with a personality and a full tank.</p>
          <Link to={`/fleet?${rq(d)}`} className="btn btn--ghost">Browse the fleet</Link>
        </div>
        <div className="hero__search"><Search initial={{ ...d, location: '' }} /></div>
      </section>

      <section className="wrap">
        <h2 className="h1">Fan favourites</h2>
        <div className="strip">
          {fleet.data?.vehicles.filter((v) => v.category === 'classic' || v.category === 'convertible').slice(0, 4).map((v) => (
            <Link key={v.slug} to={`/cars/${v.slug}?${rq(d)}`} className="strip__car" style={{ backgroundImage: `url(${v.photo})` }}>
              <span><strong>{v.name}</strong>{money(v.daily_cents)}/day</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="wrap wrap--dark">
        <h2 className="h1">Our garages</h2>
        <div className="garages">
          {locations.data?.map((l) => (
            <Link key={l.slug} to={`/fleet?location=${l.slug}&${rq(d)}`} className="garage">
              <strong>{l.name}</strong>
              <span>{l.address}, {l.city}</span>
              <small>{l.hours} · {l.vehicles} cars</small>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
