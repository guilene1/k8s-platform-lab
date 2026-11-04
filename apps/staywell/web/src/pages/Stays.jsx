import { useSearchParams } from 'react-router';
import { useApi } from '../useApi.js';
import { nightsBetween, pretty, stayFrom, stayQuery } from '../dates.js';
import SearchBar from '../components/SearchBar.jsx';
import HotelCard from '../components/HotelCard.jsx';
import { ErrorNote, Loading } from '../components/Status.jsx';

export default function Stays() {
  const [params] = useSearchParams();
  const stay = stayFrom(params);
  const city = params.get('city') || '';
  const q = stayQuery(stay);
  const { data, error, loading } = useApi(`/hotels?${q}${city ? `&city=${encodeURIComponent(city)}` : ''}`);
  const nights = nightsBetween(stay.check_in, stay.check_out);

  return (
    <div className="wrap">
      <SearchBar key={params.toString()} initial={{ ...stay, city }} compact />
      <header className="results-head">
        <h1 className="title">{city || 'All destinations'}</h1>
        <p className="muted">{pretty(stay.check_in)} → {pretty(stay.check_out)} · {nights} night{nights > 1 ? 's' : ''} · {stay.guests} guest{stay.guests > 1 ? 's' : ''}</p>
      </header>
      {loading && <Loading label="Checking availability" />}
      {error && <ErrorNote error={error} />}
      {data && data.hotels.length === 0 && <p className="muted">No hotel here sleeps {stay.guests}. Try fewer guests.</p>}
      <div className="hgrid">
        {data?.hotels.map((h) => <HotelCard key={h.slug} hotel={h} query={q} />)}
      </div>
    </div>
  );
}
