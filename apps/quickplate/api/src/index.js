// QuickPlate API - restaurants, menus, delivery orders and live tracking.
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { start, badRequest, notFound } from '../kit/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const COURIERS = ['Marco', 'Aisha', 'Tomás', 'Priya', 'Jonah', 'Lena', 'Kenji', 'Fatima'];
const SERVICE_FEE_RATE = 0.08;

// Tracking is simulated from the order's age relative to its ETA.
const STAGES = [
  { key: 'confirmed', label: 'Order confirmed', at: 0 },
  { key: 'preparing', label: 'Kitchen is cooking', at: 0.08 },
  { key: 'picked_up', label: 'Courier picked it up', at: 0.55 },
  { key: 'arriving', label: 'Almost there', at: 0.85 },
  { key: 'delivered', label: 'Delivered — enjoy!', at: 1 },
];

function tracking(order) {
  const elapsed = (Date.now() - new Date(order.created_at).getTime()) / 60000;
  const progress = Math.min(1, elapsed / order.eta_minutes);
  const current = [...STAGES].reverse().find((s) => progress >= s.at);
  return {
    status: current.key,
    progress: Number(progress.toFixed(3)),
    minutes_left: Math.max(0, Math.ceil(order.eta_minutes - elapsed)),
    stages: STAGES.map((s) => ({ ...s, done: progress >= s.at })),
  };
}

const orderCode = () => `QP-${crypto.randomBytes(4).toString('base64url').replace(/[-_]/g, 'X').slice(0, 5).toUpperCase()}`;

await start({
  name: 'quickplate',
  migrationsDir: path.join(here, '../db/migrations'),
  seedFile: path.join(here, '../db/seed.sql'),

  routes(api, { db }) {
    api.get('/cuisines', async (_req, res) => {
      const { rows } = await db.query('SELECT cuisine, count(*)::int AS count FROM restaurants GROUP BY cuisine ORDER BY count DESC, cuisine');
      res.json(rows);
    });

    api.get('/restaurants', async (req, res) => {
      const params = [];
      const where = [];
      if (req.query.cuisine) { params.push(String(req.query.cuisine)); where.push(`cuisine = $${params.length}`); }
      if (req.query.q) {
        params.push(`%${String(req.query.q).slice(0, 60)}%`);
        where.push(`(name ILIKE $${params.length} OR cuisine ILIKE $${params.length} OR EXISTS (
          SELECT 1 FROM menu_items m WHERE m.restaurant_id = restaurants.id AND m.name ILIKE $${params.length}))`);
      }
      const order = { rating: 'rating DESC, review_count DESC', fastest: 'prep_minutes ASC', fee: 'delivery_fee_cents ASC' }[req.query.sort] || 'sort_order';
      const { rows } = await db.query(
        `SELECT *, prep_minutes + 12 AS eta_minutes FROM restaurants ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${order}`,
        params);
      res.json(rows.map((r) => ({ ...r, rating: Number(r.rating) })));
    });

    api.get('/restaurants/:slug', async (req, res) => {
      const { rows } = await db.query('SELECT *, prep_minutes + 12 AS eta_minutes FROM restaurants WHERE slug = $1', [req.params.slug]);
      if (!rows.length) throw notFound('Restaurant not found');
      // Sections appear in menu order (sort_order comes from the seed list).
      const items = await db.query('SELECT * FROM menu_items WHERE restaurant_id = $1 ORDER BY sort_order, id', [rows[0].id]);
      const sections = [];
      for (const item of items.rows) {
        let s = sections.find((x) => x.name === item.section);
        if (!s) sections.push((s = { name: item.section, items: [] }));
        s.items.push(item);
      }
      res.json({ ...rows[0], rating: Number(rows[0].rating), sections });
    });

    // Prices are always recomputed on the server from the menu, never trusted
    // from the browser.
    api.post('/orders', async (req, res) => {
      const b = req.body || {};
      const name = String(b.customer_name || '').trim();
      const address = String(b.address || '').trim();
      if (!name || !address) throw badRequest('Please add your name and delivery address');
      if (!Array.isArray(b.items) || !b.items.length) throw badRequest('Your basket is empty');
      const tip = Math.max(0, Math.min(Number(b.tip_cents) || 0, 5000));

      const r = await db.query('SELECT * FROM restaurants WHERE slug = $1', [b.restaurant]);
      if (!r.rowCount) throw notFound('Restaurant not found');
      const restaurant = r.rows[0];
      const ids = b.items.map((i) => Number(i.id));
      const menu = await db.query('SELECT * FROM menu_items WHERE restaurant_id = $1 AND id = ANY($2)', [restaurant.id, ids]);
      if (menu.rowCount !== new Set(ids).size) throw badRequest('Some items are not on this menu');
      const lines = b.items.map((i) => {
        const m = menu.rows.find((x) => x.id === Number(i.id));
        const qty = Number(i.qty);
        if (!Number.isInteger(qty) || qty < 1 || qty > 20) throw badRequest('Quantities must be between 1 and 20');
        return { ...m, qty };
      });
      const subtotal = lines.reduce((s, l) => s + l.price_cents * l.qty, 0);
      if (subtotal < restaurant.min_order_cents) {
        throw badRequest(`${restaurant.name} has a minimum order of $${(restaurant.min_order_cents / 100).toFixed(2)}`);
      }
      const service = Math.round(subtotal * SERVICE_FEE_RATE);
      const total = subtotal + restaurant.delivery_fee_cents + service + tip;
      const eta = restaurant.prep_minutes + 12 + (lines.length > 3 ? 4 : 0);
      const code = orderCode();

      await db.tx(async (t) => {
        const o = await t.query(
          `INSERT INTO orders (code, restaurant_id, customer_name, address, notes, subtotal_cents, delivery_fee_cents,
                               service_fee_cents, tip_cents, total_cents, eta_minutes, courier)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
          [code, restaurant.id, name.slice(0, 80), address.slice(0, 160), String(b.notes || '').slice(0, 200),
            subtotal, restaurant.delivery_fee_cents, service, tip, total, eta,
            COURIERS[crypto.randomInt(COURIERS.length)]]);
        for (const l of lines) {
          await t.query('INSERT INTO order_items (order_id, menu_item_id, name, price_cents, qty) VALUES ($1,$2,$3,$4,$5)',
            [o.rows[0].id, l.id, l.name, l.price_cents, l.qty]);
        }
      });
      res.status(201).json({ code });
    });

    api.get('/orders/:code', async (req, res) => {
      const { rows } = await db.query(
        `SELECT o.*, r.name AS restaurant_name, r.slug AS restaurant_slug, r.image AS restaurant_image, r.neighborhood
           FROM orders o JOIN restaurants r ON r.id = o.restaurant_id WHERE o.code = $1`,
        [String(req.params.code).toUpperCase()]);
      if (!rows.length) throw notFound('We could not find that order');
      const items = await db.query('SELECT menu_item_id, name, price_cents, qty FROM order_items WHERE order_id = $1 ORDER BY name', [rows[0].id]);
      res.json({ ...rows[0], items: items.rows, tracking: tracking(rows[0]) });
    });
  },
});
