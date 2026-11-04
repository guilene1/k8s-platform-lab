import { useState } from 'react';
import { Link } from 'react-router';
import { money } from '../api.js';
import { useApi } from '../useApi.js';
import { ErrorNote, Loading } from '../components/Status.jsx';

const PRICE = ['', '$', '$$', '$$$'];

export default function Home() {
  const [cuisine, setCuisine] = useState('');
  const [sort, setSort] = useState('');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const params = new URLSearchParams();
  if (cuisine) params.set('cuisine', cuisine);
  if (sort) params.set('sort', sort);
  if (query) params.set('q', query);
  const list = useApi(`/restaurants?${params}`);
  const cuisines = useApi('/cuisines');

  return (
    <>
      <section className="hero" style={{ backgroundImage: 'url(/images/hero.jpg)' }}>
        <div className="hero__shade" />
        <div className="hero__content">
          <p className="tag">Delivering across the city · 11am – late</p>
          <h1 className="hero__title">Dinner,<br />door to door.</h1>
          <p className="hero__lede">Ten of the neighbourhood's best kitchens, cooked to order and at your door in about thirty minutes.</p>
          <form className="hero__search" onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()); document.getElementById('restaurants')?.scrollIntoView({ behavior: 'smooth' }); }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Craving pad thai, burgers, tiramisù…" aria-label="Search dishes or restaurants" />
            <button className="btn btn--ghost">Find food</button>
          </form>
        </div>
      </section>

      <section className="wrap" id="restaurants">
        <div className="list-head">
          <h2 className="big">{query ? `Results for “${query}”` : 'Hungry? Pick a kitchen.'}</h2>
          <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort restaurants">
            <option value="">Recommended</option>
            <option value="rating">Top rated</option>
            <option value="fastest">Fastest</option>
            <option value="fee">Lowest delivery fee</option>
          </select>
        </div>
        <div className="cuisines">
          <button className={`cuisine ${!cuisine ? 'is-on' : ''}`} onClick={() => setCuisine('')}>Everything</button>
          {cuisines.data?.map((c) => (
            <button key={c.cuisine} className={`cuisine ${c.cuisine === cuisine ? 'is-on' : ''}`} onClick={() => setCuisine(c.cuisine)}>{c.cuisine}</button>
          ))}
          {query && <button className="cuisine cuisine--clear" onClick={() => { setQuery(''); setQ(''); }}>Clear search ×</button>}
        </div>

        {list.loading && <Loading label="Warming up the ovens" />}
        {list.error && <ErrorNote error={list.error} />}
        {list.data?.length === 0 && <p className="muted">Nothing matches — try another craving.</p>}
        <div className="cards">
          {list.data?.map((r) => (
            <Link key={r.slug} to={`/r/${r.slug}`} className="rcard">
              <div className="rcard__img" style={{ backgroundImage: `url(${r.image})` }}>
                <span className="rcard__eta">{r.eta_minutes}–{r.eta_minutes + 10} min</span>
              </div>
              <div className="rcard__body">
                <div className="rcard__top">
                  <h3>{r.name}</h3>
                  <span className="rating">★ {r.rating.toFixed(1)}</span>
                </div>
                <p>{r.tagline}</p>
                <div className="rcard__meta">
                  <span>{r.cuisine}</span><span>{PRICE[r.price_level]}</span><span>{r.neighborhood}</span>
                  <span>{r.delivery_fee_cents ? `${money(r.delivery_fee_cents)} delivery` : 'Free delivery'}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
