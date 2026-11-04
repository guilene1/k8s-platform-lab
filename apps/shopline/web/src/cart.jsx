import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

// The bag lives on the server (carts table); the browser only remembers its id.
const KEY = 'shopline.cartId';
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState(null);
  const [error, setError] = useState(null);

  const ensureCart = useCallback(async () => {
    const saved = localStorage.getItem(KEY);
    if (saved) {
      try {
        const c = await api(`/carts/${saved}`);
        setCart(c);
        return c;
      } catch (e) {
        if (e.status !== 404) throw e;
      }
    }
    const c = await api('/carts', { method: 'POST' });
    localStorage.setItem(KEY, c.id);
    setCart(c);
    return c;
  }, []);

  useEffect(() => {
    ensureCart().catch((e) => setError(e.message));
  }, [ensureCart]);

  const setQty = useCallback(async (productId, qty) => {
    const c = cart || (await ensureCart());
    const updated = await api(`/carts/${c.id}/items/${productId}`, { method: 'PUT', body: { qty } });
    setCart(updated);
    setError(null);
    return updated;
  }, [cart, ensureCart]);

  const add = useCallback(async (product, qty = 1) => {
    const current = cart?.items.find((i) => i.id === product.id)?.qty || 0;
    return setQty(product.id, Math.min(20, current + qty));
  }, [cart, setQty]);

  const value = { cart, error, setQty, add, refresh: ensureCart, reset: () => { localStorage.removeItem(KEY); return ensureCart(); } };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
