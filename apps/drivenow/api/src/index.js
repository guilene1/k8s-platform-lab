// DriveNow API - fleet, availability, bookings with pickup and return.
//
// Vehicle photos live on the shared EFS volume (UPLOAD_DIR/vehicles): the
// sample photos are copied there at startup and the fleet manager can
// replace them; every API replica serves the same files.
import crypto from 'node:crypto';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { start, badRequest, notFound, conflict } from '../kit/index.js';
import { createUploader, removeUpload, seedFiles, serveUploads, uploadsRoot, uploadsWritable } from '../kit/uploads.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const SUBDIR = 'vehicles';
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const WEEK_DISCOUNT = 0.1;

const upload = createUploader({
  subdir: SUBDIR,
  maxBytes: 8 * 1024 * 1024,
  types: { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' },
});

function rental(q, required = false) {
  const { pickup, return: ret } = q;
  if (!pickup && !ret && !required) return null;
  if (!ISO.test(pickup || '') || !ISO.test(ret || '')) throw badRequest('Dates must be YYYY-MM-DD');
  const a = new Date(`${pickup}T00:00:00Z`);
  const b = new Date(`${ret}T00:00:00Z`);
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  const days = Math.round((b - a) / 86_400_000);
  if (Number.isNaN(days)) throw badRequest('Invalid dates');
  if (a < today) throw badRequest('Pickup can’t be in the past');
  if (days < 1) throw badRequest('Return must be at least a day after pickup');
  if (days > 28) throw badRequest('Rentals are limited to 28 days');
  return { pickup, return: ret, days };
}

const quote = (daily, days) => {
  const base = daily * days;
  const discount = days >= 7 ? Math.round(base * WEEK_DISCOUNT) : 0;
  return { base_cents: base, discount_cents: discount, total_cents: base - discount };
};

const VEHICLE_SELECT = `SELECT v.*, l.slug AS location, l.name AS location_name, l.city, l.address, l.hours
  FROM vehicles v JOIN locations l ON l.id = v.location_id`;
const shape = (v) => ({ ...v, photo: `/api/vehicle-photos/${v.photo_file}` });

// Vehicle ids already booked (reserved/picked up) for an overlapping range.
const BUSY = `SELECT vehicle_id FROM bookings WHERE status IN ('reserved','picked_up')
  AND daterange(pickup_date, return_date) && daterange($1::date, $2::date)`;

await start({
  name: 'drivenow',
  migrationsDir: path.join(here, '../db/migrations'),
  seedFile: path.join(here, '../db/seed.sql'),
  onReady: () => seedFiles(path.join(here, '../db/vehicles'), SUBDIR),
  readinessChecks: [uploadsWritable],

  routes(api, { db, log }) {
    serveUploads(api, '/vehicle-photos', SUBDIR);

    api.get('/locations', async (_req, res) => {
      const { rows } = await db.query(
        `SELECT l.*, count(v.id)::int AS vehicles FROM locations l LEFT JOIN vehicles v ON v.location_id = l.id GROUP BY l.id ORDER BY l.id`);
      res.json(rows);
    });

    api.get('/vehicles', async (req, res) => {
      const r = rental(req.query);
      const params = [];
      const where = ['v.in_service'];
      let available = 'NULL::boolean';
      if (r) { params.push(r.pickup, r.return); available = `v.id NOT IN (${BUSY})`; }
      if (req.query.location) { params.push(String(req.query.location)); where.push(`l.slug = $${params.length}`); }
      if (req.query.category) { params.push(String(req.query.category)); where.push(`v.category = $${params.length}`); }
      const { rows } = await db.query(
        `SELECT v.*, ${available} AS available, l.slug AS location, l.name AS location_name, l.city, l.address, l.hours
           FROM vehicles v JOIN locations l ON l.id = v.location_id
          WHERE ${where.join(' AND ')} ORDER BY v.daily_cents`, params);
      res.json({ rental: r, vehicles: rows.map((v) => ({ ...shape(v), ...(r ? quote(v.daily_cents, r.days) : {}) })) });
    });

    api.get('/vehicles/:slug', async (req, res) => {
      const r = rental(req.query);
      const { rows } = await db.query(`${VEHICLE_SELECT} WHERE v.slug = $1`, [req.params.slug]);
      if (!rows.length) throw notFound('Vehicle not found');
      let available = null;
      if (r) {
        const busy = await db.query(`${BUSY} AND vehicle_id = $3`, [r.pickup, r.return, rows[0].id]);
        available = busy.rowCount === 0;
      }
      const upcoming = await db.query(
        `SELECT to_char(pickup_date, 'YYYY-MM-DD') AS pickup, to_char(return_date, 'YYYY-MM-DD') AS return
           FROM bookings WHERE vehicle_id = $1 AND status IN ('reserved','picked_up') AND return_date >= current_date ORDER BY pickup_date LIMIT 6`,
        [rows[0].id]);
      res.json({ ...shape(rows[0]), rental: r, available, booked: upcoming.rows, ...(r ? quote(rows[0].daily_cents, r.days) : {}) });
    });

    api.post('/bookings', async (req, res) => {
      const b = req.body || {};
      const r = rental(b, true);
      const name = String(b.driver_name || '').trim();
      const email = String(b.email || '').trim().toLowerCase();
      if (!name) throw badRequest('Please enter the driver’s name');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest('Please enter a valid email');
      const v = await db.query('SELECT id, name, daily_cents, in_service FROM vehicles WHERE slug = $1', [b.vehicle]);
      if (!v.rowCount || !v.rows[0].in_service) throw notFound('Vehicle not available');
      const code = `DN-${crypto.randomInt(10000, 99999)}`;
      try {
        await db.query(
          `INSERT INTO bookings (code, vehicle_id, driver_name, email, pickup_date, return_date, days, total_cents)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [code, v.rows[0].id, name.slice(0, 80), email, r.pickup, r.return, r.days, quote(v.rows[0].daily_cents, r.days).total_cents]);
      } catch (err) {
        // The exclusion constraint rejects overlapping bookings atomically.
        if (err.code === '23P01' && err.constraint === 'bookings_no_overlap') {
          throw conflict(`The ${v.rows[0].name} is already booked for some of those dates`);
        }
        throw err;
      }
      res.status(201).json({ code, email });
    });

    async function booking(code, email) {
      const { rows } = await db.query(
        `SELECT b.*, to_char(b.pickup_date, 'YYYY-MM-DD') AS pickup_date, to_char(b.return_date, 'YYYY-MM-DD') AS return_date,
                v.slug AS vehicle_slug, v.name AS vehicle_name, v.photo_file, v.odometer_km, v.daily_cents,
                l.name AS location_name, l.address, l.city, l.hours
           FROM bookings b JOIN vehicles v ON v.id = b.vehicle_id JOIN locations l ON l.id = v.location_id
          WHERE b.code = $1`, [String(code).toUpperCase()]);
      if (!rows.length || rows[0].email !== String(email || '').trim().toLowerCase()) {
        throw notFound('No booking matches that code and email');
      }
      return { ...rows[0], photo: `/api/vehicle-photos/${rows[0].photo_file}` };
    }

    api.get('/bookings/:code', async (req, res) => res.json(await booking(req.params.code, req.query.email)));

    api.post('/bookings/:code/pickup', async (req, res) => {
      const bk = await booking(req.params.code, req.body?.email);
      if (bk.status !== 'reserved') throw conflict(`This booking is ${bk.status.replace('_', ' ')}`);
      await db.query("UPDATE bookings SET status = 'picked_up', picked_up_at = now(), odometer_out = $2 WHERE id = $1", [bk.id, bk.odometer_km]);
      res.json(await booking(req.params.code, req.body.email));
    });

    api.post('/bookings/:code/return', async (req, res) => {
      const bk = await booking(req.params.code, req.body?.email);
      if (bk.status !== 'picked_up') throw conflict('Only a car that has been picked up can be returned');
      const km = Number(req.body.km_driven);
      if (!Number.isInteger(km) || km < 0 || km > 20000) throw badRequest('Enter the kilometres driven (0 – 20,000)');
      await db.tx(async (t) => {
        await t.query("UPDATE bookings SET status = 'returned', returned_at = now(), odometer_in = odometer_out + $2 WHERE id = $1", [bk.id, km]);
        await t.query('UPDATE vehicles SET odometer_km = odometer_km + $2 WHERE id = $1', [bk.vehicle_id, km]);
      });
      res.json(await booking(req.params.code, req.body.email));
    });

    api.post('/bookings/:code/cancel', async (req, res) => {
      const bk = await booking(req.params.code, req.body?.email);
      if (bk.status !== 'reserved') throw conflict(`A booking that is ${bk.status.replace('_', ' ')} can’t be cancelled`);
      await db.query("UPDATE bookings SET status = 'cancelled' WHERE id = $1", [bk.id]);
      res.json(await booking(req.params.code, req.body.email));
    });

    // --- Fleet manager (demo: no login in this lab) -----------------------
    api.post('/fleet/vehicles/:slug/photo', upload.single('photo'), async (req, res) => {
      const file = req.file;
      try {
        if (!file) throw badRequest('Choose a photo');
        const r = await db.query('UPDATE vehicles SET photo_file = $2 WHERE slug = $1 RETURNING id', [req.params.slug, file.filename]);
        if (!r.rowCount) throw notFound('Vehicle not found');
        log('info', 'vehicle photo replaced', { vehicle: req.params.slug, pod: os.hostname() });
        res.status(201).json({ photo: `/api/vehicle-photos/${file.filename}`, served_by: os.hostname() });
      } catch (err) {
        if (file) await removeUpload(SUBDIR, file.filename);
        throw err;
      }
    });

    api.get('/storage', async (_req, res) => {
      const dir = path.join(uploadsRoot(), SUBDIR);
      let files = 0;
      let bytes = 0;
      for (const n of await fs.promises.readdir(dir).catch(() => [])) {
        const st = await fs.promises.stat(path.join(dir, n)).catch(() => null);
        if (st?.isFile()) { files++; bytes += st.size; }
      }
      res.json({ served_by: os.hostname(), volume: uploadsRoot(), files, bytes });
    });
  },
});
