// Prometheus metrics in the RED style (Rate, Errors, Duration):
//
//   http_requests_total{app,method,route,status}
//   http_request_errors_total{app,method,route}           (status >= 500)
//   http_request_duration_seconds{app,method,route,status} (histogram)
//
// plus the Node.js runtime defaults. `route` is the Express route pattern
// (e.g. /api/products/:slug), never the raw URL, to keep cardinality low.

import client from 'prom-client';

export function createMetrics(app) {
  const register = new client.Registry();
  register.setDefaultLabels({ app });
  client.collectDefaultMetrics({ register });

  const requests = new client.Counter({
    name: 'http_requests_total',
    help: 'HTTP requests handled',
    labelNames: ['method', 'route', 'status'],
    registers: [register],
  });
  const errors = new client.Counter({
    name: 'http_request_errors_total',
    help: 'HTTP requests that failed with a 5xx status',
    labelNames: ['method', 'route'],
    registers: [register],
  });
  const duration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request latency',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [register],
  });

  const skip = new Set(['/healthz', '/readyz', '/metrics']);

  function middleware(req, res, next) {
    if (skip.has(req.path)) return next();
    const end = duration.startTimer();
    res.on('finish', () => {
      const route = req.route ? `${res.locals.routePrefix ?? req.baseUrl}${req.route.path}` : 'unmatched';
      const labels = { method: req.method, route, status: String(res.statusCode) };
      requests.inc(labels);
      end(labels);
      if (res.statusCode >= 500) errors.inc({ method: req.method, route });
    });
    next();
  }

  async function handler(_req, res) {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  }

  return { middleware, handler, register };
}
