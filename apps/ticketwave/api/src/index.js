// TicketWave API - events, live seat maps and ticket purchases.
//
// Seats are rows A.. x numbers 1..; a ticket row exists for every sold seat
// and UNIQUE (event_id, seat_row, seat_number) guarantees a seat is never
// sold twice - concurrent buyers of the same seat get a clean 409.
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { start, badRequest, notFound, conflict } from '../kit/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FEE_CENTS = 450; // per ticket
const MAX_SEATS = 8;
const SEAT = /^([A-Z])(\d{1,2})$/;

const tierOf = (rowIdx, rowCount) => (rowIdx <= 3 ? 'front' : rowIdx > rowCount - 3 ? 'back' : 'mid');
const priceOf = (e, tier) => e[`${tier}_price_cents`];

const EVENT_SELECT = `SELECT e.*, v.name AS venue_name, v.city, v.timezone, v.slug AS venue_slug, v.row_count, v.seats_per_row,
    (v.row_count * v.seats_per_row - (SELECT count(*) FROM tickets t WHERE t.event_id = e.id))::int AS seats_left
  FROM events e JOIN venues v ON v.id = e.venue_id`;

const code = (prefix, n) => `${prefix}-${crypto.randomBytes(n).toString('base64url').toUpperCase().replace(/[^A-Z0-9]/g, '7').slice(0, 5)}`;

await start({
  name: 'ticketwave',
  migrationsDir: path.join(here, '../db/migrations'),
  seedFile: path.join(here, '../db/seed.sql'),

  routes(api, { db }) {
    api.get('/genres', async (_req, res) => {
      const { rows } = await db.query('SELECT genre, count(*)::int AS count FROM events WHERE starts_at > now() GROUP BY genre ORDER BY count DESC, genre');
      res.json(rows);
    });

    api.get('/events', async (req, res) => {
      const params = [];
      const where = ['e.starts_at > now()'];
      if (req.query.genre) { params.push(String(req.query.genre)); where.push(`e.genre = $${params.length}`); }
      if (req.query.q) { params.push(`%${String(req.query.q).slice(0, 60)}%`); where.push(`(e.title ILIKE $${params.length} OR e.artist ILIKE $${params.length} OR v.city ILIKE $${params.length})`); }
      const { rows } = await db.query(`${EVENT_SELECT} WHERE ${where.join(' AND ')} ORDER BY e.starts_at`, params);
      res.json(rows);
    });

    async function event(slug) {
      const { rows } = await db.query(`${EVENT_SELECT} WHERE e.slug = $1`, [slug]);
      if (!rows.length) throw notFound('Event not found');
      return rows[0];
    }

    api.get('/events/:slug', async (req, res) => res.json(await event(req.params.slug)));

    // The full seat map with sold seats and price tiers.
    api.get('/events/:slug/seats', async (req, res) => {
      const e = await event(req.params.slug);
      const sold = await db.query('SELECT seat_row, seat_number FROM tickets WHERE event_id = $1', [e.id]);
      const taken = new Set(sold.rows.map((s) => `${s.seat_row}${s.seat_number}`));
      const rows = [];
      for (let r = 1; r <= e.row_count; r++) {
        const row = String.fromCharCode(64 + r);
        const tier = tierOf(r, e.row_count);
        rows.push({
          row, tier, price_cents: priceOf(e, tier),
          seats: Array.from({ length: e.seats_per_row }, (_, i) => ({ n: i + 1, sold: taken.has(`${row}${i + 1}`) })),
        });
      }
      res.json({ event: e.slug, fee_cents: FEE_CENTS, rows });
    });

    api.post('/events/:slug/purchase', async (req, res) => {
      const b = req.body || {};
      const name = String(b.buyer_name || '').trim();
      const email = String(b.email || '').trim().toLowerCase();
      const seats = [...new Set((Array.isArray(b.seats) ? b.seats : []).map((s) => String(s).toUpperCase()))];
      if (!seats.length) throw badRequest('Pick at least one seat');
      if (seats.length > MAX_SEATS) throw badRequest(`You can buy up to ${MAX_SEATS} tickets per order`);
      if (!name) throw badRequest('Please enter the name for the tickets');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest('Please enter a valid email');

      const e = await event(req.params.slug);
      if (new Date(e.starts_at) < new Date()) throw badRequest('This event has already started');
      const lines = seats.map((s) => {
        const m = SEAT.exec(s);
        const rowIdx = m ? m[1].charCodeAt(0) - 64 : 0;
        const n = m ? Number(m[2]) : 0;
        if (!m || rowIdx > e.row_count || n < 1 || n > e.seats_per_row) throw badRequest(`Seat ${s} does not exist`);
        return { row: m[1], n, price: priceOf(e, tierOf(rowIdx, e.row_count)) };
      });
      const subtotal = lines.reduce((s, l) => s + l.price, 0);
      const fees = FEE_CENTS * lines.length;
      const orderCode = code('TW', 6);

      try {
        await db.tx(async (t) => {
          const o = await t.query(
            'INSERT INTO orders (code, event_id, buyer_name, email, total_cents, fees_cents) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
            [orderCode, e.id, name.slice(0, 80), email, subtotal + fees, fees]);
          let i = 1;
          for (const l of lines) {
            await t.query(
              'INSERT INTO tickets (code, order_id, event_id, seat_row, seat_number, price_cents) VALUES ($1,$2,$3,$4,$5,$6)',
              [`${orderCode}-${i++}`, o.rows[0].id, e.id, l.row, l.n, l.price]);
          }
        });
      } catch (err) {
        if (err.code === '23505' && err.constraint === 'tickets_event_id_seat_row_seat_number_key') {
          throw conflict('One of those seats was just sold. Please pick again.', { refresh: true });
        }
        throw err;
      }
      res.status(201).json({ code: orderCode, email });
    });

    api.get('/orders/:code', async (req, res) => {
      const { rows } = await db.query(
        `SELECT o.code, o.buyer_name, o.email, o.total_cents, o.fees_cents, o.created_at,
                e.slug, e.title, e.artist, e.starts_at, e.image, v.name AS venue_name, v.city, v.timezone
           FROM orders o JOIN events e ON e.id = o.event_id JOIN venues v ON v.id = e.venue_id WHERE o.code = $1`,
        [String(req.params.code).toUpperCase()]);
      if (!rows.length || rows[0].email !== String(req.query.email || '').trim().toLowerCase()) {
        throw notFound('No order matches that code and email');
      }
      const t = await db.query(
        `SELECT t.code, t.seat_row, t.seat_number, t.price_cents FROM tickets t JOIN orders o ON o.id = t.order_id
          WHERE o.code = $1 ORDER BY t.seat_row, t.seat_number`, [rows[0].code]);
      res.json({ ...rows[0], tickets: t.rows });
    });
  },
});
