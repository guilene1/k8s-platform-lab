import { Link } from 'react-router';
import { useApi } from '../useApi.js';
import ProductCard from '../components/ProductCard.jsx';
import { ErrorNote, Loading } from '../components/Status.jsx';

export default function Home() {
  const featured = useApi('/products?featured=true');
  const categories = useApi('/categories');

  return (
    <>
      <section className="hero" style={{ backgroundImage: 'url(/images/hero.jpg)' }}>
        <div className="hero__shade" />
        <div className="hero__content">
          <p className="eyebrow">The Autumn Edit — 2026</p>
          <h1 className="hero__title">Carry less.<br /><em>Carry better.</em></h1>
          <p className="hero__lede">
            Leather that ages well, watches that keep quiet, and a handful of things for home.
            Chosen slowly, made to last.
          </p>
          <div className="hero__ctas">
            <Link to="/shop" className="btn btn--ghost">Shop the edit</Link>
            <Link to="/shop/bags" className="btn btn--link">Explore bags →</Link>
          </div>
        </div>
        <div className="hero__foot">
          <span>Free shipping over $150</span>
          <span>30-day returns</span>
          <span>Lifetime repairs on leather</span>
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <div>
            <p className="eyebrow eyebrow--dark">Featured</p>
            <h2 className="section__title">Pieces we reach for</h2>
          </div>
          <Link to="/shop" className="btn btn--ghost-dark">View all</Link>
        </div>
        {featured.loading && <Loading label="Loading the edit" />}
        {featured.error && <ErrorNote error={featured.error} />}
        {featured.data && (
          <div className="grid">
            {featured.data.slice(0, 8).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      <section className="journal" style={{ backgroundImage: 'url(/images/journal.jpg)' }}>
        <div className="journal__shade" />
        <div className="journal__content">
          <p className="eyebrow">The Journal</p>
          <h2 className="journal__title">A city wardrobe in<br /><em>black, white & patience.</em></h2>
          <p>Our buyers spent a season in Lisbon living out of a single duffel. Here is what earned its place.</p>
          <Link to="/shop/outerwear" className="btn btn--ghost">Read & shop</Link>
        </div>
      </section>

      <section className="section">
        <p className="eyebrow eyebrow--dark">Departments</p>
        <h2 className="section__title">Shop by category</h2>
        {categories.error && <ErrorNote error={categories.error} />}
        <div className="cats">
          {categories.data?.map((c, i) => (
            <Link key={c.slug} to={`/shop/${c.slug}`} className="cat">
              <span className="cat__num">{String(i + 1).padStart(2, '0')}</span>
              <span className="cat__name">{c.name}</span>
              <span className="cat__tag">{c.tagline}</span>
              <span className="cat__count">{c.product_count} pieces</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
