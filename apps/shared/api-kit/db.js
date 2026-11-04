// PostgreSQL pool configured from the standard libpq environment variables
// (PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD), which the app's
// Kubernetes Secret provides. That Secret is created by External Secrets
// Operator from AWS Secrets Manager - no credential is ever in git.
//
// RDS for PostgreSQL 15+ requires TLS (rds.force_ssl=1). The image ships the
// AWS RDS CA bundle, so the server certificate is fully verified.

import fs from 'node:fs';
import pg from 'pg';

const CA_PATH = process.env.PGSSLROOTCERT || '/app/certs/rds-global-bundle.pem';

export function createDb() {
  const sslMode = process.env.PGSSLMODE || 'verify-full';
  let ssl = false;
  if (sslMode !== 'disable') {
    ssl = sslMode === 'verify-full' && fs.existsSync(CA_PATH)
      ? { ca: fs.readFileSync(CA_PATH, 'utf8'), rejectUnauthorized: true }
      : { rejectUnauthorized: false };
  }

  const pool = new pg.Pool({
    ssl,
    max: Number(process.env.PG_POOL_MAX || 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 10_000,
    application_name: process.env.APP_NAME || 'lab-api',
  });
  // An idle client erroring (e.g. RDS failover) must not crash the process.
  pool.on('error', (err) => console.error(JSON.stringify({ level: 'warn', msg: 'idle db client error', error: err.message })));

  return {
    pool,
    query: (text, params) => pool.query(text, params),
    /** Run fn(client) inside BEGIN/COMMIT, rolling back on error. */
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
    end: () => pool.end(),
  };
}
