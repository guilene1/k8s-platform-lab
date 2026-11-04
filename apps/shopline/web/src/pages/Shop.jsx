import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useApi } from '../useApi.js';
import ProductCard from '../components/ProductCard.jsx';
import { ErrorNote, Loading } from '../components/Status.jsx';

export default function Shop() {
  const { category } = useParams();
  const [sort, setSort] = useState('');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');

  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (sort) params.set('sort', sort);
  if (query) params.set('q', query);
  const products = useApi(`/products?${params}`);
  const categories = useApi('/categories');
  const current = categories.data?.find((c) => c.slug === category);

  return (
    <div className="page">
      <header className="page__head">
        <p className="eyebrow eyebrow--dark">{current ? 'Category' : 'The full collection'}</p>
        <h1 className="page__title">{current ? current.name : 'Shop everything'}</h1>
        {current && <p className="page__lede">{current.tagline}</p>}
      </header>

      <div className="toolbar">
        <div className="chips">
          <Link to="/shop" className={`chip ${!category ? 'is-active' : ''}`}>All</Link>
          {categories.data?.map((c) => (
            <Link key={c.slug} to={`/shop/${c.slug}`} className={`chip ${c.slug === category ? 'is-active' : ''}`}>
              {c.name}
            </Link>
          ))}
        </div>
        <form className="toolbar__right" onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()); }}>
          <input className="input input--sm" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
          <select className="input input--sm" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            <option value="">Featured</option>
            <option value="newest">Newest</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </form>
      </div>

      {products.loading && <Loading label="Loading products" />}
      {products.error && <ErrorNote error={products.error} />}
      {products.data && products.data.length === 0 && <p className="empty">Nothing matches that search — yet.</p>}
      {products.data && (
        <div className="grid">
          {products.data.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
