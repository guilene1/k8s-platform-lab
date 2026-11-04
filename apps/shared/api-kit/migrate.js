// Minimal, dependable schema migrations.
//
// Files in db/migrations named NNN_description.sql are applied in order, each
// in its own transaction, and recorded in schema_migrations. Every replica runs
// this on startup; a PostgreSQL advisory lock makes sure only one of them
// migrates at a time, the others wait and then find nothing left to do.

import fs from 'node:fs';
import path from 'node:path';
import { log } from './log.js';

export async function runMigrations(db, dir, appName) {
  const files = fs.readdirSync(dir).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();
  const client = await db.pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(hashtext($1))', [`migrate:${appName}`]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version    text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const { rows } = await client.query('SELECT version FROM schema_migrations');
    const done = new Set(rows.map((r) => r.version));
    for (const file of files) {
      if (done.has(file)) continue;
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      log('info', 'applying migration', { file });
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`migration ${file} failed: ${err.message}`);
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(hashtext($1))', [`migrate:${appName}`]).catch(() => {});
    client.release();
  }
}

// Seed data must be idempotent: every INSERT uses ON CONFLICT DO NOTHING
// against a UNIQUE constraint, so re-running it (every pod start) never
// duplicates rows.
export async function runSeed(db, file) {
  const sql = fs.readFileSync(file, 'utf8');
  await db.tx(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext('seed'))");
    await client.query(sql);
  });
  log('info', 'seed data applied', { file: path.basename(file) });
}
