// All data comes from the ShopLine API at /api (proxied by this container's
// nginx to the backend Service).
export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'We could not reach the store. Check your connection and try again.');
  }
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // nginx error pages (502/503/504) are HTML, not JSON.
  }
  if (!res.ok) {
    const message = data?.error || (res.status >= 500
      ? 'The store is having trouble right now. Please try again in a moment.'
      : `Request failed (${res.status})`);
    throw new ApiError(res.status, message, data?.details);
  }
  return data;
}

export const money = (cents) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: cents % 100 ? 2 : 0 })
    .format(cents / 100);
