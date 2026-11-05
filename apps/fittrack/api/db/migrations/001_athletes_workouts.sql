-- FitTrack schema: one demo athlete and their workouts.

CREATE TABLE athletes (
  id                   serial PRIMARY KEY,
  slug                 text NOT NULL UNIQUE,
  full_name            text NOT NULL,
  city                 text NOT NULL,
  weight_kg            numeric(5,1) NOT NULL,
  weekly_km_goal       int  NOT NULL,
  weekly_minutes_goal  int  NOT NULL
);

CREATE TABLE workouts (
  id           serial PRIMARY KEY,
  -- Stable external reference so seed data is idempotent; user-logged
  -- workouts get a random one.
  ext_ref      text NOT NULL UNIQUE,
  athlete_id   int  NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  type         text NOT NULL CHECK (type IN ('run', 'ride', 'intervals', 'trail', 'sprint', 'hills', 'strength', 'yoga')),
  title        text NOT NULL,
  started_at   timestamptz NOT NULL,
  duration_s   int  NOT NULL CHECK (duration_s > 0),
  distance_m   int  CHECK (distance_m >= 0),
  elevation_m  int  NOT NULL DEFAULT 0,
  avg_hr       int  CHECK (avg_hr BETWEEN 40 AND 220),
  effort       int  NOT NULL DEFAULT 5 CHECK (effort BETWEEN 1 AND 10),
  calories     int  NOT NULL,
  notes        text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX workouts_athlete_time_idx ON workouts (athlete_id, started_at DESC);
