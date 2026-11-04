import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router';
import Nav from './components/Nav.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Shop from './pages/Shop.jsx';
import Product from './pages/Product.jsx';
import Bag from './pages/Bag.jsx';
import Checkout from './pages/Checkout.jsx';
import Track from './pages/Track.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);

  return (
    <>
      <Nav overHero={pathname === '/'} />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/shop/:category" element={<Shop />} />
          <Route path="/p/:slug" element={<Product />} />
          <Route path="/bag" element={<Bag />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders" element={<Track />} />
          <Route path="/orders/:number" element={<Track />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
