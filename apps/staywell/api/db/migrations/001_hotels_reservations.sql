-- StayWell schema: hotels, room types with a fixed inventory, reservations.

CREATE TABLE hotels (
  id           serial PRIMARY KEY,
  slug         text NOT NULL UNIQUE,
  name         text NOT NULL,
  city         text NOT NULL,
  country      text NOT NULL,
  summary      text NOT NULL,
  description  text NOT NULL,
  image        text NOT NULL,
  stars        int  NOT NULL CHECK (stars BETWEEN 1 AND 5),
  rating       numeric(2,1) NOT NULL,
  review_count int  NOT NULL,
  amenities    text[] NOT NULL DEFAULT '{}',
  sort_order   int  NOT NULL DEFAULT 0
);

CREATE TABLE room_types (
  id             serial PRIMARY KEY,
  hotel_id       int  NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  slug           text NOT NULL,
  name           text NOT NULL,
  image          text NOT NULL,
  bed            text NOT NULL,
  max_guests     int  NOT NULL CHECK (max_guests > 0),
  size_m2        int  NOT NULL,
  nightly_cents  int  NOT NULL CHECK (nightly_cents > 0),
  inventory      int  NOT NULL CHECK (inventory > 0),
  features       text[] NOT NULL DEFAULT '{}',
  UNIQUE (hotel_id, slug)
);

CREATE TABLE reservations (
  id            serial PRIMARY KEY,
  code          text NOT NULL UNIQUE,
  room_type_id  int  NOT NULL REFERENCES room_types(id),
  guest_name    text NOT NULL,
  email         text NOT NULL,
  check_in      date NOT NULL,
  check_out     date NOT NULL,
  guests        int  NOT NULL CHECK (guests > 0),
  nights        int  NOT NULL,
  total_cents   int  NOT NULL,
  status        text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (check_out > check_in)
);
CREATE INDEX reservations_room_dates_idx ON reservations (room_type_id, check_in, check_out) WHERE status = 'confirmed';
