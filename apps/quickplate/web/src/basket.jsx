import { createContext, useContext, useEffect, useState } from 'react';

// One basket, from one restaurant at a time, kept in the browser. Prices
// are recalculated by the API when the order is placed.
const KEY = 'quickplate.basket';
const Ctx = createContext(null);
const empty = { restaurant: null, items: {} };

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || empty; } catch { return empty; }
}

export function BasketProvider({ children }) {
  const [basket, setBasket] = useState(load);
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(basket)), [basket]);

  const lines = Object.values(basket.items);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.qty * l.price_cents, 0);

  function add(restaurant, item) {
    setBasket((b) => {
      const fresh = !b.restaurant || b.restaurant.slug !== restaurant.slug;
      const items = fresh ? {} : { ...b.items };
      const prev = items[item.id]?.qty || 0;
      items[item.id] = { id: item.id, name: item.name, price_cents: item.price_cents, qty: Math.min(20, prev + 1) };
      const { slug, name, delivery_fee_cents, min_order_cents, image } = restaurant;
      return { restaurant: { slug, name, delivery_fee_cents, min_order_cents, image }, items };
    });
  }

  function setQty(id, qty) {
    setBasket((b) => {
      const items = { ...b.items };
      if (qty <= 0) delete items[id]; else items[id] = { ...items[id], qty: Math.min(20, qty) };
      return Object.keys(items).length ? { ...b, items } : empty;
    });
  }

  const value = { basket, lines, count, subtotal, add, setQty, clear: () => setBasket(empty) };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useBasket = () => useContext(Ctx);
