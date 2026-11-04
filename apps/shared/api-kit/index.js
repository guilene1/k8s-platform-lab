// Shared runtime for every lab API. Each app's src/index.js calls start()
// with its name, routes and SQL files; this module provides everything the
// platform expects from a well-behaved service:
//
//   GET /healthz   liveness  - the process is up (never touches the DB)
//   GET /readyz    readiness - migrations done AND the database answers
//   GET /metrics   Prometheus - request count, latency histogram, errors
//
// plus PostgreSQL (TLS to RDS), schema migrations, idempotent seed data,
// structured JSON logs and graceful shutdown on SIGTERM.
//
// In the container image this directory is copied to /app/kit, next to the
// app's own /app/src, so it resolves dependencies from the app's node_modules.

import express from 'express';
import { createDb } from './db.js';
import { runMigrations, runSeed } from './migrate.js';
import { createMetrics } from './metrics.js';
import { log } from './log.js';

export { log };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (msg, details) => new HttpError(400, msg, details);
export const notFound = (msg = 'Not found') => new HttpError(404, msg);
export const conflict = (msg, details) => new HttpError(409, msg, details);

/**
 * @param {object} opts
 * @param {string} opts.name            app name (metric label, log field)
 * @param {(router: import('express').Router, ctx: {db: object, log: Function}) => void} opts.routes
 * @param {string} opts.migrationsDir   directory of NNN_name.sql files
 * @param {string} [opts.seedFile]      idempotent seed SQL, run after migrations
 * @param {(app: import('express').Express, ctx: object) => void} [opts.extend] extra non-/api setup
 */
export async function start({ name, routes, migrationsDir, seedFile, extend }) {
  const port = Number(process.env.PORT || 8080);
  const db = createDb();
  const metrics = createMetrics(name);
  const state = { migrated: false, shuttingDown: false, lastDbError: null };

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true); // behind the ALB and the web tier's nginx
  app.use(express.json({ limit: '256kb' }));
  app.use(metrics.middleware);
  app.use(requestLog);

  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));

  app.get('/readyz', async (_req, res) => {
    if (state.shuttingDown) return res.status(503).json({ status: 'shutting-down' });
    if (!state.migrated) {
      return res.status(503).json({ status: 'starting', reason: state.lastDbError || 'running migrations' });
    }
    try {
      await db.query('SELECT 1');
      res.json({ status: 'ready' });
    } catch (err) {
      res.status(503).json({ status: 'db-unavailable', reason: err.message });
    }
  });

  app.get('/metrics', metrics.handler);

  const ctx = { db, log, name };
  if (extend) extend(app, ctx);

  const api = express.Router();
  // Remember the mount path now: Express resets req.baseUrl once a handler
  // throws, and the metrics need the full route pattern (/api/...).
  api.use((req, res, next) => { res.locals.routePrefix = req.baseUrl; next(); });
  routes(api, ctx);
  app.use('/api', api);

  app.use('/api', (_req, _res, next) => next(notFound('No such endpoint')));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
    if (status >= 500) log('error', 'request failed', { path: req.path, error: err.message, stack: err.stack });
    res.status(status).json({
      error: status >= 500 ? 'Internal server error' : err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  });

  const server = app.listen(port, () => log('info', `${name} api listening`, { port }));
  server.keepAliveTimeout = 65_000; // longer than the ALB / nginx idle timeouts

  // Bring the database up in the background so liveness passes immediately and
  // readiness tells Kubernetes (and the student) what is going on. The DB may
  // not exist yet on a fresh cluster: the db-bootstrap Job creates it.
  (async () => {
    for (let attempt = 1; !state.shuttingDown; attempt++) {
      try {
        await runMigrations(db, migrationsDir, name);
        if (seedFile) await runSeed(db, seedFile);
        state.migrated = true;
        state.lastDbError = null;
        log('info', 'database ready', { attempt });
        return;
      } catch (err) {
        state.lastDbError = err.message;
        log('warn', 'database not ready, retrying', { attempt, error: err.message });
        await sleep(Math.min(30_000, 2_000 * attempt));
      }
    }
  })();

  const shutdown = (signal) => {
    if (state.shuttingDown) return;
    state.shuttingDown = true;
    log('info', 'shutting down', { signal });
    // Give the ALB and kube-proxy time to stop sending traffic (readiness is
    // already failing), then drain connections and close the pool.
    setTimeout(() => {
      server.close(() => db.end().finally(() => process.exit(0)));
      setTimeout(() => process.exit(0), 10_000).unref();
    }, 5_000);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return { app, db };
}

function requestLog(req, res, next) {
  if (req.path === '/healthz' || req.path === '/readyz' || req.path === '/metrics') return next();
  const t0 = process.hrtime.bigint();
  res.on('finish', () => {
    log(res.statusCode >= 500 ? 'error' : 'info', 'request', {
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      ms: Number((process.hrtime.bigint() - t0) / 1_000_000n),
    });
  });
  next();
}
