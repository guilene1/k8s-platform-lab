import { useEffect, useState } from 'react';
import { api } from './api.js';

// An anonymous id for this browser, so "saved homes" work without accounts.
export function visitorId() {
  let id = localStorage.getItem('homefinder.visitor');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('homefinder.visitor', id);
  }
  return id;
}

export function useSaved() {
  const [saved, setSaved] = useState(new Set());
  useEffect(() => {
    api(`/saved?visitor=${visitorId()}`).then((rows) => setSaved(new Set(rows.map((r) => r.slug)))).catch(() => {});
  }, []);

  async function toggle(slug) {
    const on = saved.has(slug);
    if (on) await api(`/saved/${slug}?visitor=${visitorId()}`, { method: 'DELETE' });
    else await api(`/saved/${slug}`, { method: 'PUT', body: { visitor: visitorId() } });
    setSaved((s) => {
      const n = new Set(s);
      if (on) n.delete(slug); else n.add(slug);
      return n;
    });
  }
  return { saved, toggle };
}

export const compactPrice = (cents) => {
  const d = cents / 100;
  return d >= 1_000_000 ? `$${(d / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M` : `$${Math.round(d / 1000)}K`;
};
