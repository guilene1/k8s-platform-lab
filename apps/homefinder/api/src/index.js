// HomeFinder API - listings, photo uploads to shared EFS storage, saved homes.
//
// Every listing photo is a file on the EFS volume mounted at UPLOAD_DIR
// (ReadWriteMany): any API replica can serve a photo that any other replica
// received. GET /api/storage shows which pod answered and what the shared
// volume holds - handy for proving it in class.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { start, badRequest, notFound } from '../kit/index.js';
import { createUploader, removeUpload, seedFiles, serveUploads, uploadsRoot, uploadsWritable } from '../kit/uploads.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const SUBDIR = 'photos';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TYPES = ['house', 'townhouse', 'condo', 'loft', 'cottage'];

const upload = createUploader({
  subdir: SUBDIR,
  maxBytes: 10 * 1024 * 1024,
  types: { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' },
});

const photoUrl = (file) => `/api/photos/${file}`;
const shape = (l) => ({
  ...l,
  price_cents: Number(l.price_cents),
  baths: Number(l.baths),
  cover: l.cover ? photoUrl(l.cover) : null,
});

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);

await start({
  name: 'homefinder',
  migrationsDir: path.join(here, '../db/migrations'),
  seedFile: path.join(here, '../db/seed.sql'),
  // Copy the bundled sample photos onto the shared volume (skips existing).
  onReady: () => seedFiles(path.join(here, '../db/photos'), SUBDIR),
  readinessChecks: [uploadsWritable],

  routes(api, { db, log }) {
    serveUploads(api, '/photos', SUBDIR);

    const LISTING_SELECT = `SELECT l.*,
        (SELECT file FROM photos p WHERE p.listing_id = l.id ORDER BY position, id LIMIT 1) AS cover,
        (SELECT count(*)::int FROM photos p WHERE p.listing_id = l.id) AS photo_count
      FROM listings l`;

    api.get('/listings', async (req, res) => {
      const where = [];
      const params = [];
      const add = (sql, v) => { params.push(v); where.push(sql.replace('?', `$${params.length}`)); };
      if (req.query.city) add('l.city = ?', String(req.query.city));
      if (req.query.type && TYPES.includes(req.query.type)) add('l.property_type = ?', req.query.type);
      if (Number(req.query.min_beds)) add('l.beds >= ?', Number(req.query.min_beds));
      if (Number(req.query.max_price)) add('l.price_cents <= ?', Number(req.query.max_price));
      const order = { 'price-asc': 'l.price_cents', 'price-desc': 'l.price_cents DESC', size: 'l.sqft DESC' }[req.query.sort] || 'l.listed_at DESC';
      const { rows } = await db.query(`${LISTING_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${order}`, params);
      res.json(rows.map(shape));
    });

    api.get('/cities', async (_req, res) => {
      const { rows } = await db.query('SELECT city, count(*)::int AS count FROM listings GROUP BY city ORDER BY count DESC, city');
      res.json(rows);
    });

    api.get('/listings/:slug', async (req, res) => {
      const { rows } = await db.query(`${LISTING_SELECT} WHERE l.slug = $1`, [req.params.slug]);
      if (!rows.length) throw notFound('Listing not found');
      const photos = await db.query(
        'SELECT id, file, caption, source, uploaded_by, uploaded_at FROM photos WHERE listing_id = $1 ORDER BY position, id', [rows[0].id]);
      res.json({ ...shape(rows[0]), photos: photos.rows.map((p) => ({ ...p, url: photoUrl(p.file) })) });
    });

    // Add photos to an existing listing (multipart field "photos").
    api.post('/listings/:slug/photos', upload.array('photos', 6), async (req, res) => {
      const files = req.files || [];
      try {
        if (!files.length) throw badRequest('Choose at least one photo');
        const l = await db.query('SELECT id FROM listings WHERE slug = $1', [req.params.slug]);
        if (!l.rowCount) throw notFound('Listing not found');
        const caption = String(req.body.caption || '').slice(0, 80);
        for (const f of files) {
          await db.query(
            'INSERT INTO photos (listing_id, file, caption, source, bytes, uploaded_by) VALUES ($1,$2,$3,$4,$5,$6)',
            [l.rows[0].id, f.filename, caption, 'upload', f.size, os.hostname()]);
        }
        log('info', 'photos uploaded', { listing: req.params.slug, count: files.length, pod: os.hostname() });
        res.status(201).json({ uploaded: files.length, served_by: os.hostname() });
      } catch (err) {
        await Promise.all(files.map((f) => removeUpload(SUBDIR, f.filename)));
        throw err;
      }
    });

    // "List your home": a new listing with its photos, in one multipart form.
    api.post('/listings', upload.array('photos', 6), async (req, res) => {
      const files = req.files || [];
      try {
        const b = req.body || {};
        const need = ['title', 'address', 'city', 'neighborhood', 'property_type', 'price', 'beds', 'baths', 'sqft', 'description'];
        const missing = need.filter((k) => !String(b[k] ?? '').trim());
        if (missing.length) throw badRequest('Please complete all fields', { missing });
        if (!TYPES.includes(b.property_type)) throw badRequest('Unknown property type');
        if (!files.length) throw badRequest('Add at least one photo');
        const price = Math.round(Number(b.price) * 100);
        const nums = [price, Number(b.beds), Number(b.baths), Number(b.sqft)];
        if (nums.some((n) => !Number.isFinite(n) || n < 0) || price <= 0 || Number(b.sqft) <= 0) throw badRequest('Check the price, beds, baths and size');

        const slug = await db.tx(async (t) => {
          const base = slugify(b.title) || 'listing';
          const taken = await t.query("SELECT count(*)::int AS n FROM listings WHERE slug = $1 OR slug LIKE $1 || '-%'", [base]);
          const s = taken.rows[0].n ? `${base}-${taken.rows[0].n + 1}` : base;
          const l = await t.query(
            `INSERT INTO listings (slug, title, address, city, neighborhood, property_type, price_cents, beds, baths, sqft,
                                   description, features, agent_name)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
            [s, b.title.trim().slice(0, 90), b.address.trim().slice(0, 120), b.city.trim().slice(0, 60), b.neighborhood.trim().slice(0, 60),
              b.property_type, price, Number(b.beds), Number(b.baths), Number(b.sqft), b.description.trim().slice(0, 1500),
              String(b.features || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 8), 'Listed by owner']);
          let pos = 0;
          for (const f of files) {
            await t.query('INSERT INTO photos (listing_id, file, source, position, bytes, uploaded_by) VALUES ($1,$2,$3,$4,$5,$6)',
              [l.rows[0].id, f.filename, 'upload', pos++, f.size, os.hostname()]);
          }
          return s;
        });
        res.status(201).json({ slug, served_by: os.hostname() });
      } catch (err) {
        await Promise.all(files.map((f) => removeUpload(SUBDIR, f.filename)));
        throw err;
      }
    });

    // Saved homes, keyed by an anonymous visitor id kept in the browser.
    function visitor(v) {
      if (!UUID.test(String(v || ''))) throw badRequest('visitor id required');
      return v;
    }
    api.get('/saved', async (req, res) => {
      const v = visitor(req.query.visitor);
      const { rows } = await db.query(`${LISTING_SELECT} JOIN saved_homes s ON s.listing_id = l.id WHERE s.visitor_id = $1 ORDER BY s.saved_at DESC`, [v]);
      res.json(rows.map(shape));
    });
    api.put('/saved/:slug', async (req, res) => {
      const v = visitor(req.body?.visitor);
      const r = await db.query(
        `INSERT INTO saved_homes (visitor_id, listing_id) SELECT $1, id FROM listings WHERE slug = $2
         ON CONFLICT DO NOTHING RETURNING listing_id`, [v, req.params.slug]);
      const exists = r.rowCount || (await db.query('SELECT 1 FROM listings WHERE slug = $1', [req.params.slug])).rowCount;
      if (!exists) throw notFound('Listing not found');
      res.json({ saved: true });
    });
    api.delete('/saved/:slug', async (req, res) => {
      const v = visitor(req.query.visitor);
      await db.query('DELETE FROM saved_homes WHERE visitor_id = $1 AND listing_id = (SELECT id FROM listings WHERE slug = $2)', [v, req.params.slug]);
      res.json({ saved: false });
    });

    // Which pod answered, and what is on the shared volume.
    api.get('/storage', async (_req, res) => {
      const dir = path.join(uploadsRoot(), SUBDIR);
      let files = 0;
      let bytes = 0;
      for (const name of await fs.promises.readdir(dir).catch(() => [])) {
        const st = await fs.promises.stat(path.join(dir, name)).catch(() => null);
        if (st?.isFile()) { files++; bytes += st.size; }
      }
      const uploads = await db.query("SELECT count(*)::int AS n, count(DISTINCT uploaded_by)::int AS pods FROM photos WHERE source = 'upload'");
      res.json({ served_by: os.hostname(), volume: uploadsRoot(), files, bytes, uploads: uploads.rows[0].n, upload_pods: uploads.rows[0].pods });
    });
  },
});
