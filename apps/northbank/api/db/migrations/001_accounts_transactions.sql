-- Northbank schema: one demo customer, their accounts, payees, transactions
-- and transfers. Money is always integer cents.

CREATE TABLE customers (
  id          serial PRIMARY KEY,
  slug        text NOT NULL UNIQUE,
  full_name   text NOT NULL,
  email       text NOT NULL,
  member_since date NOT NULL
);

CREATE TABLE accounts (
  id                 serial PRIMARY KEY,
  number             text NOT NULL UNIQUE,
  customer_id        int  NOT NULL REFERENCES customers(id),
  type               text NOT NULL CHECK (type IN ('checking', 'savings', 'credit')),
  nickname           text NOT NULL,
  balance_cents      bigint NOT NULL,
  credit_limit_cents bigint,
  apy_bps            int,
  opened_at          date NOT NULL DEFAULT current_date
);

CREATE TABLE payees (
  id              serial PRIMARY KEY,
  customer_id     int  NOT NULL REFERENCES customers(id),
  name            text NOT NULL,
  bank            text NOT NULL,
  account_number  text NOT NULL,
  UNIQUE (customer_id, account_number)
);

CREATE TABLE transactions (
  id            bigserial PRIMARY KEY,
  reference     text NOT NULL UNIQUE,
  account_id    int  NOT NULL REFERENCES accounts(id),
  posted_at     timestamptz NOT NULL,
  description   text NOT NULL,
  category      text NOT NULL,
  kind          text NOT NULL CHECK (kind IN ('card', 'deposit', 'transfer', 'interest', 'fee', 'payment')),
  amount_cents  bigint NOT NULL CHECK (amount_cents <> 0)
);
CREATE INDEX transactions_account_time_idx ON transactions (account_id, posted_at DESC, id DESC);

CREATE TABLE transfers (
  id               serial PRIMARY KEY,
  reference        text NOT NULL UNIQUE,
  from_account_id  int  NOT NULL REFERENCES accounts(id),
  to_account_id    int  REFERENCES accounts(id),
  payee_id         int  REFERENCES payees(id),
  amount_cents     bigint NOT NULL CHECK (amount_cents > 0),
  memo             text NOT NULL DEFAULT '',
  created_at       timestamptz NOT NULL DEFAULT now(),
  CHECK ((to_account_id IS NULL) <> (payee_id IS NULL))
);

CREATE SEQUENCE transfer_ref_seq START 482100;
