-- DriveNow schema: pickup locations, the fleet (photos on EFS), bookings.

-- btree_gist lets an exclusion constraint combine "same vehicle" (=) with
-- "overlapping dates" (&&). It is a *trusted* extension, so the app's own
-- database owner role can create it - no superuser needed (also on RDS).
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE locations (
  id       serial PRIMARY KEY,
  slug     text NOT NULL UNIQUE,
  name     text NOT NULL,
  city     text NOT NULL,
  address  text NOT NULL,
  hours    text NOT NULL
);

CREATE TABLE vehicles (
  id            serial PRIMARY KEY,
  slug          text NOT NULL UNIQUE,
  name          text NOT NULL,
  category      text NOT NULL CHECK (category IN ('compact', 'sedan', 'suv', 'wagon', 'convertible', 'classic', '4x4')),
  year          int  NOT NULL,
  seats         int  NOT NULL,
  transmission  text NOT NULL CHECK (transmission IN ('automatic', 'manual')),
  fuel          text NOT NULL CHECK (fuel IN ('petrol', 'diesel', 'hybrid', 'electric')),
  daily_cents   int  NOT NULL CHECK (daily_cents > 0),
  location_id   int  NOT NULL REFERENCES locations(id),
  -- File name on the shared EFS volume under <UPLOAD_DIR>/vehicles.
  photo_file    text NOT NULL,
  odometer_km   int  NOT NULL DEFAULT 0,
  features      text[] NOT NULL DEFAULT '{}',
  blurb         text NOT NULL,
  in_service    boolean NOT NULL DEFAULT true
);

CREATE TABLE bookings (
  id            serial PRIMARY KEY,
  code          text NOT NULL UNIQUE,
  vehicle_id    int  NOT NULL REFERENCES vehicles(id),
  driver_name   text NOT NULL,
  email         text NOT NULL,
  pickup_date   date NOT NULL,
  return_date   date NOT NULL,
  days          int  NOT NULL,
  total_cents   int  NOT NULL,
  status        text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'picked_up', 'returned', 'cancelled')),
  odometer_out  int,
  odometer_in   int,
  picked_up_at  timestamptz,
  returned_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (return_date > pickup_date),
  -- A vehicle can't be booked twice for overlapping dates.
  CONSTRAINT bookings_no_overlap EXCLUDE USING gist (
    vehicle_id WITH =,
    daterange(pickup_date, return_date) WITH &&
  ) WHERE (status IN ('reserved', 'picked_up'))
);
