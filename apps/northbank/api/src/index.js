// Northbank API - accounts, transaction history, transfers, insights.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { start, badRequest, notFound, conflict } from '../kit/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const CUSTOMER = 'jordan-reyes'; // single demo customer - no login in this lab
const MAX_TRANSFER = 2_500_000; // $25,000

const ACCOUNT_COLS = `a.id, a.number, a.type, a.nickname, a.balance_cents, a.credit_limit_cents, a.apy_bps, a.opened_at`;

const mask = (n) => `•••• ${n.slice(-4)}`;
const shape = (a) => ({
  ...a,
  balance_cents: Number(a.balance_cents),
  credit_limit_cents: a.credit_limit_cents == null ? null : Number(a.credit_limit_cents),
  masked: mask(a.number),
  available_cents: a.type === 'credit'
    ? Number(a.credit_limit_cents) + Number(a.balance_cents)
    : Number(a.balance_cents),
});
const tx = (t) => ({ ...t, amount_cents: Number(t.amount_cents), balance_after_cents: t.balance_after_cents == null ? undefined : Number(t.balance_after_cents) });

await start({
  name: 'northbank',
  migrationsDir: path.join(here, '../db/migrations'),
  seedFile: path.join(here, '../db/seed.sql'),

  routes(api, { db }) {
    async function customer() {
      const { rows } = await db.query('SELECT * FROM customers WHERE slug = $1', [CUSTOMER]);
      if (!rows.length) throw notFound('Customer not found');
      return rows[0];
    }

    async function account(number) {
      const { rows } = await db.query(
        `SELECT ${ACCOUNT_COLS} FROM accounts a JOIN customers c ON c.id = a.customer_id
          WHERE c.slug = $1 AND a.number = $2`,
        [CUSTOMER, number],
      );
      if (!rows.length) throw notFound('Account not found');
      return shape(rows[0]);
    }

    api.get('/overview', async (_req, res) => {
      const c = await customer();
      const { rows: accounts } = await db.query(
        `SELECT ${ACCOUNT_COLS} FROM accounts a WHERE a.customer_id = $1 ORDER BY a.id`, [c.id]);
      const month = await db.query(
        `SELECT coalesce(sum(amount_cents) FILTER (WHERE amount_cents > 0 AND category <> 'Transfer'), 0) AS money_in,
                coalesce(-sum(amount_cents) FILTER (WHERE amount_cents < 0 AND kind = 'card'), 0) AS money_out
           FROM transactions t JOIN accounts a ON a.id = t.account_id
          WHERE a.customer_id = $1 AND t.posted_at >= date_trunc('month', now())`, [c.id]);
      const recent = await db.query(
        `SELECT t.reference, t.posted_at, t.description, t.category, t.kind, t.amount_cents, a.nickname AS account, a.number
           FROM transactions t JOIN accounts a ON a.id = t.account_id
          WHERE a.customer_id = $1 ORDER BY t.posted_at DESC, t.id DESC LIMIT 8`, [c.id]);
      const shaped = accounts.map(shape);
      res.json({
        customer: { name: c.full_name, email: c.email, member_since: c.member_since },
        accounts: shaped,
        net_worth_cents: shaped.reduce((s, a) => s + a.balance_cents, 0),
        month: { in_cents: Number(month.rows[0].money_in), out_cents: Number(month.rows[0].money_out) },
        recent: recent.rows.map(tx),
      });
    });

    api.get('/accounts/:number', async (req, res) => {
      const a = await account(req.params.number);
      const m = await db.query(
        `SELECT coalesce(sum(amount_cents) FILTER (WHERE amount_cents > 0), 0) AS money_in,
                coalesce(-sum(amount_cents) FILTER (WHERE amount_cents < 0), 0) AS money_out,
                count(*)::int AS count
           FROM transactions WHERE account_id = $1 AND posted_at >= date_trunc('month', now())`, [a.id]);
      const cats = await db.query('SELECT DISTINCT category FROM transactions WHERE account_id = $1 ORDER BY 1', [a.id]);
      res.json({
        ...a,
        month: { in_cents: Number(m.rows[0].money_in), out_cents: Number(m.rows[0].money_out), count: m.rows[0].count },
        categories: cats.rows.map((r) => r.category),
      });
    });

    // History with a running balance, newest first.
    api.get('/accounts/:number/transactions', async (req, res) => {
      const a = await account(req.params.number);
      const limit = Math.min(Number(req.query.limit) || 40, 200);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      const params = [a.id, a.balance_cents];
      const filters = [];
      if (req.query.category) { params.push(String(req.query.category)); filters.push(`category = $${params.length}`); }
      if (req.query.q) { params.push(`%${String(req.query.q).slice(0, 60)}%`); filters.push(`description ILIKE $${params.length}`); }
      params.push(limit, offset);
      const { rows } = await db.query(
        `WITH running AS (
           SELECT t.*, $2::bigint - coalesce(sum(amount_cents) OVER (
             ORDER BY posted_at DESC, id DESC ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS balance_after_cents
             FROM transactions t WHERE account_id = $1)
         SELECT reference, posted_at, description, category, kind, amount_cents, balance_after_cents
           FROM running ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
          ORDER BY posted_at DESC, id DESC
          LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      );
      res.json(rows.map(tx));
    });

    api.get('/insights', async (req, res) => {
      const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 120);
      const c = await customer();
      const { rows } = await db.query(
        `SELECT category, -sum(amount_cents)::bigint AS total_cents, count(*)::int AS count
           FROM transactions t JOIN accounts a ON a.id = t.account_id
          WHERE a.customer_id = $1 AND t.kind = 'card' AND t.amount_cents < 0
            AND t.posted_at >= now() - make_interval(days => $2)
          GROUP BY category ORDER BY total_cents DESC`, [c.id, days]);
      res.json({ days, categories: rows.map((r) => ({ ...r, total_cents: Number(r.total_cents) })) });
    });

    api.get('/payees', async (_req, res) => {
      const c = await customer();
      const { rows } = await db.query('SELECT id, name, bank, account_number FROM payees WHERE customer_id = $1 ORDER BY name', [c.id]);
      res.json(rows.map((p) => ({ ...p, masked: mask(p.account_number) })));
    });

    api.get('/transfers', async (_req, res) => {
      const c = await customer();
      const { rows } = await db.query(
        `SELECT t.reference, t.amount_cents, t.memo, t.created_at, f.nickname AS from_account,
                coalesce(ta.nickname, p.name) AS to_name
           FROM transfers t JOIN accounts f ON f.id = t.from_account_id
           LEFT JOIN accounts ta ON ta.id = t.to_account_id LEFT JOIN payees p ON p.id = t.payee_id
          WHERE f.customer_id = $1 ORDER BY t.created_at DESC LIMIT 10`, [c.id]);
      res.json(rows.map((r) => ({ ...r, amount_cents: Number(r.amount_cents) })));
    });

    // Move money between own accounts or to a payee. Balances are locked
    // (SELECT ... FOR UPDATE) so concurrent transfers can't overdraw.
    api.post('/transfers', async (req, res) => {
      const { from_account, to_account, payee_id, memo = '' } = req.body || {};
      const amount = Number(req.body?.amount_cents);
      if (!Number.isInteger(amount) || amount <= 0) throw badRequest('Enter an amount greater than zero');
      if (amount > MAX_TRANSFER) throw badRequest('Transfers are limited to $25,000 at a time');
      if (!from_account || (!to_account && !payee_id) || (to_account && payee_id)) {
        throw badRequest('Choose where the money comes from and where it goes');
      }
      if (to_account && to_account === from_account) throw badRequest('Pick two different accounts');
      const c = await customer();

      const result = await db.tx(async (t) => {
        const numbers = [from_account, to_account].filter(Boolean);
        const { rows: accts } = await t.query(
          `SELECT ${ACCOUNT_COLS} FROM accounts a WHERE a.customer_id = $1 AND a.number = ANY($2) ORDER BY a.id FOR UPDATE`,
          [c.id, numbers]);
        const from = accts.find((a) => a.number === from_account);
        const to = to_account ? accts.find((a) => a.number === to_account) : null;
        if (!from || (to_account && !to)) throw notFound('Account not found');
        if (from.type === 'credit') throw badRequest('Transfers can only be made from checking or savings');
        if (Number(from.balance_cents) < amount) {
          throw conflict('Insufficient funds', { available_cents: Number(from.balance_cents) });
        }
        let payee = null;
        if (payee_id) {
          const p = await t.query('SELECT * FROM payees WHERE id = $1 AND customer_id = $2', [payee_id, c.id]);
          if (!p.rowCount) throw notFound('Payee not found');
          payee = p.rows[0];
        }

        const seq = await t.query("SELECT 'TR' || nextval('transfer_ref_seq') AS ref");
        const ref = seq.rows[0].ref;
        const note = String(memo).slice(0, 80);
        const toName = to ? to.nickname : payee.name;
        await t.query(
          'INSERT INTO transfers (reference, from_account_id, to_account_id, payee_id, amount_cents, memo) VALUES ($1,$2,$3,$4,$5,$6)',
          [ref, from.id, to?.id ?? null, payee?.id ?? null, amount, note]);
        await t.query('UPDATE accounts SET balance_cents = balance_cents - $1 WHERE id = $2', [amount, from.id]);
        await t.query(
          `INSERT INTO transactions (reference, account_id, posted_at, description, category, kind, amount_cents)
           VALUES ($1, $2, now(), $3, 'Transfer', 'transfer', $4)`,
          [`${ref}-OUT`, from.id, `Transfer to ${toName}${note ? ` — ${note}` : ''}`, -amount]);
        if (to) {
          await t.query('UPDATE accounts SET balance_cents = balance_cents + $1 WHERE id = $2', [amount, to.id]);
          await t.query(
            `INSERT INTO transactions (reference, account_id, posted_at, description, category, kind, amount_cents)
             VALUES ($1, $2, now(), $3, $4, $5, $6)`,
            [`${ref}-IN`, to.id, to.type === 'credit' ? 'Payment — thank you' : `Transfer from ${from.nickname}`,
              to.type === 'credit' ? 'Payment' : 'Transfer', to.type === 'credit' ? 'payment' : 'transfer', amount]);
        }
        return { reference: ref, amount_cents: amount, from: from.nickname, to: toName, memo: note };
      });

      res.status(201).json({ ...result, created_at: new Date().toISOString() });
    });
  },
});
