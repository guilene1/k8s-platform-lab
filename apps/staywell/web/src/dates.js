export const iso = (d) => d.toISOString().slice(0, 10);

export function addDays(isoDate, n) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
}

export const today = () => iso(new Date());

export function defaultStay() {
  const inDate = addDays(today(), 14);
  return { check_in: inDate, check_out: addDays(inDate, 3), guests: 2 };
}

export const pretty = (isoDate) =>
  new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

export const nightsBetween = (a, b) => Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86_400_000);

/** Read the stay from the URL, falling back to defaults. */
export function stayFrom(params) {
  const d = defaultStay();
  return {
    check_in: params.get('check_in') || d.check_in,
    check_out: params.get('check_out') || d.check_out,
    guests: Number(params.get('guests')) || d.guests,
  };
}

export const stayQuery = (s) => new URLSearchParams({ check_in: s.check_in, check_out: s.check_out, guests: String(s.guests) }).toString();
