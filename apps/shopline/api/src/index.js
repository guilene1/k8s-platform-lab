// ShopLine API - catalog, cart, checkout and order tracking.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { start, badRequest, notFound, conflict } from '../kit/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));

const FREE_SHIPPING_CENTS = 15000;
const SHIPPING_CENTS = 900;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PRODUCT_COLUMNS = `p.id, p.slug, p.name, p.price_cents, p.description, p.details, p.image,
  p.stock, p.badge, p.featured, c.slug AS category, c.name AS category_name`;

// Simulated fulfilment: an order moves through these stages over time so
// the tracking page always has something to show.
function orderStatus(createdAt) {
  const hours = (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
  if (hours < 0.25) return 'placed';
  if (hours < 6) return 'packed';
  if (hours < 48) return 'shipped';
  return 'delivered';
}

function shippingFor(subtotal) {
  return subtotal === 0 || subtotal >= FREE_SHIPPING_CENTS ? 0 : SHIPPING_CENTS;
}

async function loadCart(db, id) {
  const cart = await db.query('SELECT id FROM carts WHERE id = $1', [id]);
  if (!cart.rowCount) throw notFound('Cart not found');
  const { rows } = await db.query(
    `SELECT ${PRODUCT_COLUMNS}, ci.qty
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       JOIN categories c ON c.id = p.category_id
      WHERE ci.cart_id = $1
      ORDER BY ci.added_at`,
    [id],
  );
  const subtotal = rows.reduce((s, r) => s + r.price_cents * r.qty, 0);
  const shipping = shippingFor(subtotal);
  return {
    id,
    items: rows,
    count: rows.reduce((s, r) => s + r.qty, 0),
    subtotal_cents: subtotal,
    shipping_cents: shipping,
    total_cents: subtotal + shipping,
    free_shipping_threshold_cents: FREE_SHIPPING_CENTS,
  };
}

async function loadOrder(db, number) {
  const { rows } = await db.query('SELECT * FROM orders WHERE number = $1', [number]);
  if (!rows.length) return null;
  const order = rows[0];
  const items = await db.query(
    'SELECT product_id, name, image, price_cents, qty FROM order_items WHERE order_id = $1 ORDER BY name',
    [order.id],
  );
  return { ...order, status: orderStatus(order.created_at), items: items.rows };
}

function cartId(req) {
  if (!UUID.test(req.params.id)) throw notFound('Cart not found');
  return req.params.id;
}

await start({
  name: 'shopline',
  migrationsDir: path.join(here, '../db/migrations'),
  seedFile: path.join(here, '../db/seed.sql'),

  routes(api, { db }) {
    api.get('/categories', async (_req, res) => {
      const { rows } = await db.query(
        `SELECT c.slug, c.name, c.tagline, count(p.id)::int AS product_count
           FROM categories c LEFT JOIN products p ON p.category_id = c.id
          GROUP BY c.id ORDER BY c.sort_order`,
      );
      res.json(rows);
    });

    api.get('/products', async (req, res) => {
      const where = [];
      const params = [];
      if (req.query.category) {
        params.push(String(req.query.category));
        where.push(`c.slug = $${params.length}`);
      }
      if (req.query.q) {
        params.push(`%${String(req.query.q).slice(0, 60)}%`);
        where.push(`(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
      }
      if (req.query.featured === 'true') where.push('p.featured');
      const order = {
        'price-asc': 'p.price_cents ASC',
        'price-desc': 'p.price_cents DESC',
        newest: 'p.created_at DESC, p.id DESC',
      }[req.query.sort] || 'p.featured DESC, p.id ASC';
      const { rows } = await db.query(
        `SELECT ${PRODUCT_COLUMNS} FROM products p JOIN categories c ON c.id = p.category_id
          ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${order}`,
        params,
      );
      res.json(rows);
    });

    api.get('/products/:slug', async (req, res) => {
      const { rows } = await db.query(
        `SELECT ${PRODUCT_COLUMNS} FROM products p JOIN categories c ON c.id = p.category_id WHERE p.slug = $1`,
        [req.params.slug],
      );
      if (!rows.length) throw notFound('Product not found');
      const related = await db.query(
        `SELECT ${PRODUCT_COLUMNS} FROM products p JOIN categories c ON c.id = p.category_id
          WHERE c.slug = $1 AND p.slug <> $2 ORDER BY p.featured DESC, p.id LIMIT 4`,
        [rows[0].category, rows[0].slug],
      );
      res.json({ ...rows[0], related: related.rows });
    });

    api.post('/carts', async (_req, res) => {
      const { rows } = await db.query('INSERT INTO carts DEFAULT VALUES RETURNING id');
      res.status(201).json(await loadCart(db, rows[0].id));
    });

    api.get('/carts/:id', async (req, res) => {
      res.json(await loadCart(db, cartId(req)));
    });

    // Set the quantity of one product in the cart (0 removes it).
    api.put('/carts/:id/items/:productId', async (req, res) => {
      const id = cartId(req);
      const productId = Number(req.params.productId);
      const qty = Number(req.body?.qty);
      if (!Number.isInteger(productId) || !Number.isInteger(qty) || qty < 0 || qty > 20) {
        throw badRequest('qty must be an integer between 0 and 20');
      }
      await loadCart(db, id); // 404 for unknown carts
      if (qty === 0) {
        await db.query('DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2', [id, productId]);
      } else {
        const product = await db.query('SELECT stock FROM products WHERE id = $1', [productId]);
        if (!product.rowCount) throw notFound('Product not found');
        if (product.rows[0].stock < qty) throw conflict(`Only ${product.rows[0].stock} left in stock`);
        await db.query(
          `INSERT INTO cart_items (cart_id, product_id, qty) VALUES ($1, $2, $3)
           ON CONFLICT (cart_id, product_id) DO UPDATE SET qty = EXCLUDED.qty`,
          [id, productId, qty],
        );
      }
      await db.query('UPDATE carts SET updated_at = now() WHERE id = $1', [id]);
      res.json(await loadCart(db, id));
    });

    api.post('/carts/:id/checkout', async (req, res) => {
      const id = cartId(req);
      const b = req.body || {};
      const fields = ['email', 'full_name', 'address', 'city', 'postal_code', 'country'];
      const missing = fields.filter((f) => !String(b[f] || '').trim());
      if (missing.length) throw badRequest('Please complete all fields', { missing });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) throw badRequest('Please enter a valid email');

      const number = await db.tx(async (tx) => {
        // Lock the cart's products so two checkouts can't oversell.
        const { rows: items } = await tx.query(
          `SELECT p.id, p.name, p.image, p.price_cents, p.stock, ci.qty
             FROM cart_items ci JOIN products p ON p.id = ci.product_id
            WHERE ci.cart_id = $1 ORDER BY p.id FOR UPDATE OF p`,
          [id],
        );
        if (!items.length) throw badRequest('Your bag is empty');
        const short = items.filter((i) => i.stock < i.qty);
        if (short.length) {
          throw conflict('Some items are no longer available in that quantity', {
            items: short.map((i) => ({ name: i.name, available: i.stock })),
          });
        }
        const subtotal = items.reduce((s, i) => s + i.price_cents * i.qty, 0);
        const shipping = shippingFor(subtotal);
        const seq = await tx.query("SELECT 'SL-' || nextval('order_number_seq') AS number");
        const orderNumber = seq.rows[0].number;
        const order = await tx.query(
          `INSERT INTO orders (number, email, full_name, address, city, postal_code, country,
                               subtotal_cents, shipping_cents, total_cents)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
          [orderNumber, b.email.trim().toLowerCase(), b.full_name.trim(), b.address.trim(), b.city.trim(),
            b.postal_code.trim(), b.country.trim(), subtotal, shipping, subtotal + shipping],
        );
        for (const i of items) {
          await tx.query(
            'INSERT INTO order_items (order_id, product_id, name, image, price_cents, qty) VALUES ($1,$2,$3,$4,$5,$6)',
            [order.rows[0].id, i.id, i.name, i.image, i.price_cents, i.qty],
          );
          await tx.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [i.qty, i.id]);
        }
        await tx.query('DELETE FROM cart_items WHERE cart_id = $1', [id]);
        return orderNumber;
      });

      res.status(201).json(await loadOrder(db, number));
    });

    // Order tracking needs the order number AND the email it was placed with.
    api.get('/orders/:number', async (req, res) => {
      const order = await loadOrder(db, String(req.params.number).toUpperCase());
      const email = String(req.query.email || '').trim().toLowerCase();
      if (!order || order.email !== email) throw notFound('No order matches that number and email');
      res.json(order);
    });
  },
});
