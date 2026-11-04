-- CareSlot schema: specialties, doctors with weekly schedules, appointments.
-- All times are stored as timestamptz; schedules are interpreted in the
-- clinic's time zone (see CLINIC_TZ in src/index.js).

CREATE TABLE specialties (
  id           serial PRIMARY KEY,
  slug         text NOT NULL UNIQUE,
  name         text NOT NULL,
  description  text NOT NULL,
  sort_order   int  NOT NULL DEFAULT 0
);

CREATE TABLE doctors (
  id            serial PRIMARY KEY,
  slug          text NOT NULL UNIQUE,
  full_name     text NOT NULL,
  credentials   text NOT NULL,
  specialty_id  int  NOT NULL REFERENCES specialties(id),
  bio           text NOT NULL,
  photo         text NOT NULL,
  clinic        text NOT NULL,
  languages     text[] NOT NULL DEFAULT '{English}',
  years         int  NOT NULL,
  rating        numeric(2,1) NOT NULL,
  review_count  int  NOT NULL,
  -- Weekly schedule: ISO weekdays (1 = Monday) and working hours.
  weekdays      int[] NOT NULL,
  start_hour    int  NOT NULL CHECK (start_hour BETWEEN 6 AND 20),
  end_hour      int  NOT NULL CHECK (end_hour BETWEEN 7 AND 22),
  slot_minutes  int  NOT NULL DEFAULT 30 CHECK (slot_minutes IN (15, 20, 30, 45, 60)),
  accepting_new boolean NOT NULL DEFAULT true,
  CHECK (end_hour > start_hour)
);

CREATE TABLE appointments (
  id            serial PRIMARY KEY,
  code          text NOT NULL UNIQUE,
  doctor_id     int  NOT NULL REFERENCES doctors(id),
  starts_at     timestamptz NOT NULL,
  patient_name  text NOT NULL,
  email         text NOT NULL,
  reason        text NOT NULL DEFAULT '',
  visit_type    text NOT NULL DEFAULT 'in-person' CHECK (visit_type IN ('in-person', 'video')),
  status        text NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'cancelled')),
  created_at    timestamptz NOT NULL DEFAULT now()
);
-- A slot can only be booked once (cancelled appointments free it again).
CREATE UNIQUE INDEX appointments_slot_uq ON appointments (doctor_id, starts_at) WHERE status = 'booked';
