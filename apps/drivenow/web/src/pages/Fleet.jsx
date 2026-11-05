import { Link, useSearchParams } from 'react-router';
import { money } from '../api.js';
import { useApi } from '../useApi.js';
import { pretty, rentalFrom, rq } from '../dates.js';
import Search from '../components/Search.jsx';
import { ErrorNote, Loading } from '../components/Status.jsx';

const CATS = ['', 'classic', 'convertible', 'sedan', 'wagon', 'suv', '4x4', 'compact'];

export default function Fleet() {
  const [params, setParams] = useSearchParams();
  const r = rentalFrom(params);
  const category = params.get('category') || '';
  const q = new URLSearchParams({ pickup: r.pickup, return: r.return });
  if (r.location) q.set('location', r.location);
  if (category) q.set('category', category);
  const { data, error, loading } = useApi(`/vehicles?${q}`);
  const setCat = (c) => { const n = new URLSearchParams(params); if (c) n.set('category', c); else n.delete('category'); setParams(n); };

  return (
    <div className="wrap">
      <Search key={params.toString()} initial={r} inline />
      <h1 className="h1">The fleet <small>{pretty(r.pickup)} → {pretty(r.return)} · {data?.rental?.days ?? '…'} days</small></h1>
      <div className="cats">
        {CATS.map((c) => <button key={c || 'all'} className={category === c ? 'is-on' : ''} onClick={() => setCat(c)}>{c || 'All'}</button>)}
      </div>
      {loading && <Loading label="Fuelling up" />}
      {error && <ErrorNote error={error} />}
      <div className="cars">
        {data?.vehicles.map((v) => (
          <Link key={v.slug} to={`/cars/${v.slug}?${rq(r)}`} className={`car ${v.available === false ? 'car--busy' : ''}`}>
            <div className="car__img" style={{ backgroundImage: `url(${v.photo})` }}>
              <span className="car__cat">{v.category}</span>
              {v.available === false && <span className="car__busy">Booked these dates</span>}
            </div>
            <div className="car__body">
              <div className="car__top"><h3>{v.name}</h3><span className="car__year">{v.year}</span></div>
              <p>{v.seats} seats · {v.transmission} · {v.fuel} · {v.location_name}</p>
              <div className="car__price">
                <span><strong>{money(v.daily_cents)}</strong>/day</span>
                {v.total_cents && <span className="muted">{money(v.total_cents)} total{v.discount_cents ? ' (weekly rate)' : ''}</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
