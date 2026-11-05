export const iso = (d) => d.toISOString().slice(0, 10);
export const addDays = (s, n) => {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};
export const today = () => iso(new Date());
export const defaults = () => ({ pickup: addDays(today(), 7), return: addDays(today(), 10) });
export const pretty = (s) => new Date(`${s}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
export const rentalFrom = (params) => {
  const d = defaults();
  return { pickup: params.get('pickup') || d.pickup, return: params.get('return') || d.return, location: params.get('location') || '' };
};
export const rq = (r) => new URLSearchParams({ pickup: r.pickup, return: r.return }).toString();
