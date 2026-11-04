import { useState } from 'react';
import { useApi } from '../useApi.js';
import { useSaved } from '../saved.js';
import ListingCard from '../components/ListingCard.jsx';
import { ErrorNote, Loading } from '../components/Status.jsx';

export default function Home() {
  const [f, setF] = useState({ city: '', type: '', min_beds: '', max_price: '', sort: '' });
  const params = new URLSearchParams(Object.entries(f).filter(([, v]) => v));
  const listings = useApi(`/listings?${params}`);
  const cities = useApi('/cities');
  const { saved, toggle } = useSaved();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <>
      <section className="hero" style={{ backgroundImage: 'url(/images/hero.jpg)' }}>
        <div className="hero__shade" />
        <div className="hero__content">
          <p className="label">Pacific Northwest · {listings.data?.length ?? '—'} homes for sale</p>
          <h1 className="hero__title">Find the one<br />with character.</h1>
          <p className="hero__lede">Brick, clapboard, timber and steel. Homes with a story, photographed by the people who know them best.</p>
          <a href="#homes" className="btn btn--ghost">Start looking</a>
        </div>
      </section>

      <section className="wrap" id="homes">
        <div className="filters">
          <label><span>City</span>
            <select value={f.city} onChange={set('city')}>
              <option value="">Anywhere</option>
              {cities.data?.map((c) => <option key={c.city} value={c.city}>{c.city} ({c.count})</option>)}
            </select></label>
          <label><span>Type</span>
            <select value={f.type} onChange={set('type')}>
              <option value="">Any</option>
              {['house', 'townhouse', 'condo', 'loft', 'cottage'].map((t) => <option key={t} value={t}>{t}</option>)}
            </select></label>
          <label><span>Beds</span>
            <select value={f.min_beds} onChange={set('min_beds')}>
              <option value="">Any</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}
            </select></label>
          <label><span>Max price</span>
            <select value={f.max_price} onChange={set('max_price')}>
              <option value="">No max</option>
              {[60, 80, 100, 150].map((k) => <option key={k} value={k * 1_000_000}>${k * 10}K</option>)}
            </select></label>
          <label><span>Sort</span>
            <select value={f.sort} onChange={set('sort')}>
              <option value="">Newest</option>
              <option value="price-asc">Price ↑</option>
              <option value="price-desc">Price ↓</option>
              <option value="size">Largest</option>
            </select></label>
        </div>

        {listings.loading && <Loading label="Unlocking the front doors" />}
        {listings.error && <ErrorNote error={listings.error} />}
        {listings.data?.length === 0 && <p className="muted">No homes match those filters.</p>}
        <div className="lgrid">
          {listings.data?.map((l) => <ListingCard key={l.slug} l={l} saved={saved.has(l.slug)} onToggle={toggle} />)}
        </div>
      </section>
    </>
  );
}
