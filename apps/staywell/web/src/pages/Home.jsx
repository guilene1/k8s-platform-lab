import { Link } from 'react-router';
import { useApi } from '../useApi.js';
import { defaultStay, stayQuery } from '../dates.js';
import SearchBar from '../components/SearchBar.jsx';
import HotelCard from '../components/HotelCard.jsx';
import { ErrorNote, Loading } from '../components/Status.jsx';

export default function Home() {
  const stay = defaultStay();
  const hotels = useApi('/hotels');
  const destinations = useApi('/destinations');

  return (
    <>
      <section className="hero" style={{ backgroundImage: 'url(/images/hero.jpg)' }}>
        <div className="hero__shade" />
        <div className="hero__content">
          <p className="eyebrow">Eight hotels · Hand-picked · No resort fees</p>
          <h1 className="hero__title">Stay somewhere<br /><em>worth remembering.</em></h1>
          <p className="hero__lede">From a lakeside chalet in Hallstatt to a pool that pours into the Atlantic — places we would go back to.</p>
          <a href="#explore" className="btn btn--ghost">Explore stays</a>
        </div>
        <div className="hero__search"><SearchBar initial={stay} /></div>
      </section>

      <section className="wrap" id="explore">
        <p className="eyebrow eyebrow--dark">Destinations</p>
        <h2 className="title">Where to next?</h2>
        {destinations.error && <ErrorNote error={destinations.error} />}
        <div className="dests">
          {destinations.data?.map((d) => (
            <Link key={d.city} to={`/stays?city=${encodeURIComponent(d.city)}&${stayQuery(stay)}`} className="dest" style={{ backgroundImage: `url(${d.image})` }}>
              <span>{d.city}</span><small>{d.country}</small>
            </Link>
          ))}
        </div>
      </section>

      <section className="wrap">
        <p className="eyebrow eyebrow--dark">The collection</p>
        <h2 className="title">Every hotel we love</h2>
        {hotels.loading && <Loading label="Opening the guest book" />}
        {hotels.error && <ErrorNote error={hotels.error} />}
        <div className="hgrid">
          {hotels.data?.hotels.map((h) => <HotelCard key={h.slug} hotel={h} query={stayQuery(stay)} />)}
        </div>
      </section>
    </>
  );
}
