import { Link } from 'react-router';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div>
          <div className="footer__logo">Shop<span>Line</span></div>
          <p className="footer__note">Considered goods for everyday carry, travel and home. Free shipping over $150.</p>
        </div>
        <div className="footer__cols">
          <div>
            <h4>Shop</h4>
            <Link to="/shop/bags">Bags</Link>
            <Link to="/shop/watches">Watches</Link>
            <Link to="/shop/eyewear">Eyewear</Link>
            <Link to="/shop/home">Home</Link>
          </div>
          <div>
            <h4>Help</h4>
            <Link to="/orders">Track an order</Link>
            <Link to="/bag">Your bag</Link>
          </div>
        </div>
      </div>
      <div className="footer__legal">
        A Kubernetes Platform Lab demo store. No payment is taken. Photography: CC0, see CREDITS.md.
      </div>
    </footer>
  );
}
