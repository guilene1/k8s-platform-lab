// StayWell API - hotel search, room availability, reservations.
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { start, badRequest, notFound, conflict } from '../kit/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const TAX_RATE = 0.12;

// Validate an optional stay; returns null if no dates were given.
function stay(q, required = false) {
  const { check_in: inDate, check_out: outDate } = q;
  if (!inDate && !outDate && !required) return null;
  if (!ISO.test(inDate || '') || !ISO.test(outDate || '')) throw badRequest('Dates must be YYYY-MM-DD');
  const a = new Date(`${inDate}T00:00:00Z`);
  const b = new Date(`${outDate}T00:00:00Z`);
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
  const nights = Math.round((b - a) / 86_400_000);
  if (Number.isNaN(nights)) throw badRequest('Invalid dates');
  if (a < today) throw badRequest('Check-in can’t be in the past');
  if (nights < 1) throw badRequest('Check-out must be after check-in');
  if (nights > 30) throw badRequest('Stays are limited to 30 nights');
  return { check_in: inDate, check_out: outDate, nights };
}

// Rooms of a type still free for every night of the stay.
// `a`/`b` are the SQL placeholders holding check-in/check-out.
const available = (a, b) => `rt.inventory - (
  SELECT count(*) FROM reservations res
   WHERE res.room_type_id = rt.id AND res.status = 'confirmed'
     AND daterange(res.check_in, res.check_out) && daterange(${a}::date, ${b}::date))::int`;

const priced = (nightly, nights) => {
  const subtotal = nightly * nights;
  const taxes = Math.round(subtotal * TAX_RATE);
  return { subtotal_cents: subtotal, taxes_cents: taxes, total_cents: subtotal + taxes };
};

await start({
  name: 'staywell',
  migrationsDir: path.join(here, '../db/migrations'),
  seedFile: path.join(here, '../db/seed.sql'),

  routes(api, { db }) {
    api.get('/destinations', async (_req, res) => {
      const { rows } = await db.query(
        `SELECT city, country, count(*)::int AS hotels, min(image) AS image FROM hotels GROUP BY city, country ORDER BY min(sort_order)`);
      res.json(rows);
    });

    api.get('/hotels', async (req, res) => {
      const s = stay(req.query);
      const guests = Math.max(1, Number(req.query.guests) || 1);
      const params = [guests];
      let where = 'rt.max_guests >= $1';
      let roomsLeft = 'NULL::int';
      if (s) {
        params.push(s.check_in, s.check_out);
        roomsLeft = `sum(GREATEST(${available('$2', '$3')}, 0))::int`;
      }
      if (req.query.city) { params.push(String(req.query.city)); where += ` AND h.city = $${params.length}`; }
      const { rows } = await db.query(
        `SELECT h.slug, h.name, h.city, h.country, h.summary, h.image, h.stars, h.rating, h.review_count, h.amenities,
                min(rt.nightly_cents)::int AS from_cents,
                ${roomsLeft} AS rooms_left
           FROM hotels h JOIN room_types rt ON rt.hotel_id = h.id
          WHERE ${where}
          GROUP BY h.id ORDER BY h.sort_order`,
        params);
      res.json({ stay: s, guests, hotels: rows.map((h) => ({ ...h, rating: Number(h.rating) })) });
    });

    api.get('/hotels/:slug', async (req, res) => {
      const s = stay(req.query);
      const h = await db.query('SELECT * FROM hotels WHERE slug = $1', [req.params.slug]);
      if (!h.rowCount) throw notFound('Hotel not found');
      const rooms = await db.query(
        `SELECT rt.*, ${s ? available('$2', '$3') : 'NULL::int'} AS available
           FROM room_types rt WHERE rt.hotel_id = $1 ORDER BY rt.nightly_cents`,
        s ? [h.rows[0].id, s.check_in, s.check_out] : [h.rows[0].id]);
      res.json({
        ...h.rows[0],
        rating: Number(h.rows[0].rating),
        stay: s,
        rooms: rooms.rows.map((r) => ({ ...r, ...(s ? priced(r.nightly_cents, s.nights) : {}) })),
      });
    });

    // Booking locks the room type row, re-counts overlapping reservations and
    // only then inserts - two guests can't take the last room at once.
    api.post('/reservations', async (req, res) => {
      const b = req.body || {};
      const s = stay(b, true);
      const guests = Number(b.guests);
      const name = String(b.guest_name || '').trim();
      const email = String(b.email || '').trim().toLowerCase();
      if (!name) throw badRequest('Please enter the guest name');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest('Please enter a valid email');
      if (!Number.isInteger(guests) || guests < 1) throw badRequest('Guests must be at least 1');

      const code = await db.tx(async (t) => {
        const r = await t.query('SELECT * FROM room_types rt WHERE id = $1 FOR UPDATE', [Number(b.room_type_id)]);
        if (!r.rowCount) throw notFound('Room not found');
        const room = r.rows[0];
        if (guests > room.max_guests) throw badRequest(`${room.name} sleeps up to ${room.max_guests}`);
        const left = await t.query(`SELECT ${available('$2', '$3')} AS available FROM room_types rt WHERE rt.id = $1`, [room.id, s.check_in, s.check_out]);
        if (left.rows[0].available < 1) throw conflict(`${room.name} is fully booked for those dates`);
        const newCode = `SW-${crypto.randomInt(10000, 99999)}`;
        const { total_cents } = priced(room.nightly_cents, s.nights);
        await t.query(
          `INSERT INTO reservations (code, room_type_id, guest_name, email, check_in, check_out, guests, nights, total_cents)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [newCode, room.id, name.slice(0, 80), email, s.check_in, s.check_out, guests, s.nights, total_cents]);
        return newCode;
      });
      res.status(201).json({ code, email });
    });

    async function reservation(code, email) {
      const { rows } = await db.query(
        `SELECT res.*, to_char(res.check_in, 'YYYY-MM-DD') AS check_in, to_char(res.check_out, 'YYYY-MM-DD') AS check_out,
                rt.name AS room_name, rt.image AS room_image, rt.bed, h.name AS hotel_name, h.slug AS hotel_slug,
                h.city, h.country, h.image AS hotel_image
           FROM reservations res JOIN room_types rt ON rt.id = res.room_type_id JOIN hotels h ON h.id = rt.hotel_id
          WHERE res.code = $1`, [String(code).toUpperCase()]);
      if (!rows.length || rows[0].email !== String(email || '').trim().toLowerCase()) {
        throw notFound('No reservation matches that code and email');
      }
      return rows[0];
    }

    api.get('/reservations/:code', async (req, res) => {
      res.json(await reservation(req.params.code, req.query.email));
    });

    api.post('/reservations/:code/cancel', async (req, res) => {
      const r = await reservation(req.params.code, req.body?.email);
      if (r.status === 'cancelled') throw conflict('This reservation is already cancelled');
      await db.query("UPDATE reservations SET status = 'cancelled' WHERE id = $1", [r.id]);
      res.json({ ...r, status: 'cancelled' });
    });
  },
});
