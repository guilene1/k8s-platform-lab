import { Link } from 'react-router';
import { money } from '../api.js';

export default function ProductCard({ product }) {
  return (
    <Link to={`/p/${product.slug}`} className="card">
      <div className="card__media">
        <img src={product.image} alt={product.name} loading="lazy" />
        {product.badge && <span className="card__badge">{product.badge}</span>}
        {product.stock === 0 && <span className="card__badge card__badge--muted">Sold out</span>}
      </div>
      <div className="card__body">
        <span className="card__cat">{product.category_name}</span>
        <h3 className="card__name">{product.name}</h3>
        <span className="card__price">{money(product.price_cents)}</span>
      </div>
    </Link>
  );
}
