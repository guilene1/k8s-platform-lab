-- TicketWave schema: venues with a seat grid, events, orders and tickets.

CREATE TABLE venues (
  id             serial PRIMARY KEY,
  slug           text NOT NULL UNIQUE,
  name           text NOT NULL,
  city           text NOT NULL,
  timezone       text NOT NULL,
  row_count      int  NOT NULL CHECK (row_count BETWEEN 1 AND 26),
  seats_per_row  int  NOT NULL CHECK (seats_per_row BETWEEN 1 AND 40)
);

CREATE TABLE events (
  id                 serial PRIMARY KEY,
  slug               text NOT NULL UNIQUE,
  title              text NOT NULL,
  artist             text NOT NULL,
  genre              text NOT NULL,
  venue_id           int  NOT NULL REFERENCES venues(id),
  starts_at          timestamptz NOT NULL,
  image              text NOT NULL,
  description        text NOT NULL,
  -- Price tiers by row: front (first 3 rows), middle, back (last 3 rows).
  front_price_cents  int  NOT NULL,
  mid_price_cents    int  NOT NULL,
  back_price_cents   int  NOT NULL
);

CREATE TABLE orders (
  id           serial PRIMARY KEY,
  code         text NOT NULL UNIQUE,
  event_id     int  NOT NULL REFERENCES events(id),
  buyer_name   text NOT NULL,
  email        text NOT NULL,
  total_cents  int  NOT NULL,
  fees_cents   int  NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tickets (
  id           serial PRIMARY KEY,
  code         text NOT NULL UNIQUE,
  order_id     int  NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_id     int  NOT NULL REFERENCES events(id),
  seat_row     text NOT NULL,
  seat_number  int  NOT NULL,
  price_cents  int  NOT NULL,
  -- Each seat can be sold exactly once per event.
  UNIQUE (event_id, seat_row, seat_number)
);
