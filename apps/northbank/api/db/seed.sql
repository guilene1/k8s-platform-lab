-- Idempotent seed data. Every INSERT hits a UNIQUE constraint
-- (customers.slug, accounts.number, payees(customer_id, account_number),
-- transactions.reference) with ON CONFLICT DO NOTHING, so re-runs never
-- duplicate rows. Transaction history is generated relative to the first run.

INSERT INTO customers (slug, full_name, email, member_since)
VALUES ('jordan-reyes', 'Jordan Reyes', 'jordan.reyes@example.com', '2019-04-12')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO accounts (number, customer_id, type, nickname, balance_cents, credit_limit_cents, apy_bps, opened_at)
SELECT a.number, c.id, a.type, a.nickname, a.balance, a.limit_cents, a.apy, a.opened::date
FROM (VALUES
  ('NB-0042-1187', 'checking', 'Everyday Checking',   482317::bigint, NULL::bigint, NULL::int, '2019-04-12'),
  ('NB-0042-5530', 'savings',  'High-Yield Savings', 1824050,        NULL,         410,       '2019-04-12'),
  ('NB-0042-9906', 'credit',   'Northbank Rewards',  -126840,        800000,       NULL,      '2021-09-03')
) AS a(number, type, nickname, balance, limit_cents, apy, opened)
CROSS JOIN customers c WHERE c.slug = 'jordan-reyes'
ON CONFLICT (number) DO NOTHING;

INSERT INTO payees (customer_id, name, bank, account_number)
SELECT c.id, p.name, p.bank, p.acct
FROM (VALUES
  ('Maya Okonkwo',        'Harbor Credit Union', 'HC-77120-04'),
  ('Lakeside Apartments', 'First Meridian',      'FM-55091-88'),
  ('City Utilities',      'Commonwealth Bank',   'CW-10020-31'),
  ('Sam Whitaker',        'Northbank',           'NB-0077-4410')
) AS p(name, bank, acct)
CROSS JOIN customers c WHERE c.slug = 'jordan-reyes'
ON CONFLICT (customer_id, account_number) DO NOTHING;

-- ~90 days of everyday card spending on checking.
INSERT INTO transactions (reference, account_id, posted_at, description, category, kind, amount_cents)
SELECT 'SEED-CHK-' || g, a.id,
       date_trunc('hour', now()) - (g * interval '21 hours'),
       m.name, m.category, 'card', -(m.base + (g * 137) % m.spread)
FROM generate_series(1, 100) AS g
JOIN accounts a ON a.number = 'NB-0042-1187'
JOIN (VALUES
  (0,  'Blue Bottle Coffee',     'Dining',        480,  700),
  (1,  'Whole Foods Market',     'Groceries',     4200, 6500),
  (2,  'Metro Transit',          'Transport',     275,  300),
  (3,  'Trader Joe''s',          'Groceries',     3100, 4000),
  (4,  'Corner Bistro',          'Dining',        2400, 3600),
  (5,  'Lyft',                   'Transport',     1300, 2200),
  (6,  'Neighborhood Pharmacy',  'Health',        900,  2500),
  (7,  'Bookshop on Main',       'Shopping',      1800, 2400),
  (8,  'Spotify',                'Subscriptions', 1199, 1),
  (9,  'Sunrise Bakery',         'Dining',        650,  900),
  (10, 'Shell Station',          'Transport',     3800, 2500),
  (11, 'Hardware Depot',         'Home',          2600, 5200),
  (12, 'Farmers Market',         'Groceries',     1900, 2100),
  (13, 'Cinema Paradiso',        'Entertainment', 1600, 1200)
) AS m(idx, name, category, base, spread) ON m.idx = g % 14
ON CONFLICT (reference) DO NOTHING;

-- Payroll every 14 days, rent monthly. Dated rows are never in the future.
INSERT INTO transactions (reference, account_id, posted_at, description, category, kind, amount_cents)
SELECT 'SEED-PAY-' || g, a.id, date_trunc('day', now()) - (g * 14 + 3) * interval '1 day' + interval '9 hours',
       'Payroll — Lumen Analytics', 'Income', 'deposit', 412500
FROM generate_series(0, 6) AS g JOIN accounts a ON a.number = 'NB-0042-1187'
ON CONFLICT (reference) DO NOTHING;

INSERT INTO transactions (reference, account_id, posted_at, description, category, kind, amount_cents)
SELECT 'SEED-RENT-' || g, a.id, date_trunc('month', now()) - (g * interval '1 month') + interval '1 day 8 hours',
       'Lakeside Apartments — Rent', 'Housing', 'transfer', -215000
FROM generate_series(0, 2) AS g JOIN accounts a ON a.number = 'NB-0042-1187'
WHERE date_trunc('month', now()) - (g * interval '1 month') + interval '1 day 8 hours' <= now()
ON CONFLICT (reference) DO NOTHING;

-- Savings: monthly sweep in + interest.
INSERT INTO transactions (reference, account_id, posted_at, description, category, kind, amount_cents)
SELECT 'SEED-SAV-' || g, a.id, date_trunc('month', now()) - (g * interval '1 month') + interval '4 days 10 hours',
       'Transfer from Everyday Checking', 'Transfer', 'transfer', 60000
FROM generate_series(0, 3) AS g JOIN accounts a ON a.number = 'NB-0042-5530'
WHERE date_trunc('month', now()) - (g * interval '1 month') + interval '4 days 10 hours' <= now()
ON CONFLICT (reference) DO NOTHING;

INSERT INTO transactions (reference, account_id, posted_at, description, category, kind, amount_cents)
SELECT 'SEED-INT-' || g, a.id, date_trunc('month', now()) - (g * interval '1 month') + interval '23 hours',
       'Interest earned', 'Income', 'interest', 6120 - g * 85
FROM generate_series(0, 3) AS g JOIN accounts a ON a.number = 'NB-0042-5530'
WHERE date_trunc('month', now()) - (g * interval '1 month') + interval '23 hours' <= now()
ON CONFLICT (reference) DO NOTHING;

-- Credit card purchases.
INSERT INTO transactions (reference, account_id, posted_at, description, category, kind, amount_cents)
SELECT 'SEED-CC-' || g, a.id, date_trunc('hour', now()) - (g * interval '2 days 5 hours'),
       m.name, m.category, 'card', -(m.base + (g * 211) % m.spread)
FROM generate_series(1, 36) AS g
JOIN accounts a ON a.number = 'NB-0042-9906'
JOIN (VALUES
  (0, 'Delta Air Lines',      'Travel',        18900, 22000),
  (1, 'Harbor Grill',         'Dining',        5400,  4800),
  (2, 'Apple Store',          'Shopping',      2900,  9000),
  (3, 'Hotel Marlowe',        'Travel',        21900, 9000),
  (4, 'Gym Collective',       'Health',        5900,  1),
  (5, 'Uniqlo',               'Shopping',      4900,  5200)
) AS m(idx, name, category, base, spread) ON m.idx = g % 6
ON CONFLICT (reference) DO NOTHING;

INSERT INTO transactions (reference, account_id, posted_at, description, category, kind, amount_cents)
SELECT 'SEED-CCPAY-' || g, a.id, date_trunc('month', now()) - (g * interval '1 month') + interval '12 days',
       'Payment — thank you', 'Payment', 'payment', 95000
FROM generate_series(1, 2) AS g JOIN accounts a ON a.number = 'NB-0042-9906'
ON CONFLICT (reference) DO NOTHING;
