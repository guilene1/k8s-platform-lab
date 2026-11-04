export const signed = (cents) => {
  const s = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(cents) / 100);
  return cents < 0 ? `−${s}` : `+${s}`;
};

export const usd = (cents) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

export const day = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export const TYPE_LABEL = { checking: 'Checking', savings: 'Savings', credit: 'Credit card' };
