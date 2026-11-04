import { Link } from 'react-router';

export default function NotFound() {
  return (
    <div className="page page--narrow">
      <p className="eyebrow eyebrow--dark">404</p>
      <h1 className="page__title">We couldn't find that page.</h1>
      <p className="empty"><Link to="/shop">Back to the shop →</Link></p>
    </div>
  );
}
