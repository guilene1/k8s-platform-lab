-- Idempotent seed: athletes.slug and workouts.ext_ref are UNIQUE, and every
-- INSERT uses ON CONFLICT DO NOTHING. Ten weeks of training are generated
-- relative to the first run, with a gentle build in volume week over week.

INSERT INTO athletes (slug, full_name, city, weight_kg, weekly_km_goal, weekly_minutes_goal)
VALUES ('sam-rivera', 'Sam Rivera', 'Denver', 68.5, 80, 420)
ON CONFLICT (slug) DO NOTHING;

-- Weekly pattern (day offset from Monday, type, title, base minutes, base km,
-- elevation, effort). g = weeks ago (9 .. 0); volume grows ~4% a week.
INSERT INTO workouts (ext_ref, athlete_id, type, title, started_at, duration_s, distance_m, elevation_m, avg_hr, effort, calories)
SELECT 'seed-w' || g || '-d' || p.dow,
       a.id, p.type, p.title,
       date_trunc('week', now()) - g * interval '1 week' + p.dow * interval '1 day' + interval '6 hours 30 minutes' + (g * 7 % 40) * interval '1 minute',
       round(p.mins * 60 * (1 + (9 - g) * 0.04) * (0.93 + ((g * 13 + p.dow * 7) % 15) / 100.0))::int,
       CASE WHEN p.km IS NULL THEN NULL ELSE round(p.km * 1000 * (1 + (9 - g) * 0.04) * (0.93 + ((g * 11 + p.dow * 5) % 15) / 100.0))::int END,
       p.elev + (g * 3 % 40),
       p.hr - (9 - g) + (p.dow * 3 % 6),
       p.effort,
       round(p.mins * p.kcal_per_min * (1 + (9 - g) * 0.04))::int
FROM generate_series(0, 9) AS g
JOIN athletes a ON a.slug = 'sam-rivera'
CROSS JOIN (VALUES
  (0, 'run',       'Easy recovery run',      40, 7.0,  40,  138, 3, 10.5),
  (1, 'intervals', 'Track 6 × 800m',         55, 9.5,  10,  162, 8, 13.0),
  (2, 'ride',      'Lunch ride along the creek', 75, 32.0, 210, 132, 5, 9.5),
  (3, 'strength',  'Gym: legs & core',       45, NULL, 0,   118, 6, 7.0),
  (4, 'run',       'Tempo run',              50, 10.0, 70,  158, 7, 12.5),
  (5, 'trail',     'Long trail run',         110, 18.0, 520, 146, 6, 11.5),
  (6, 'yoga',      'Mobility & yoga',        35, NULL, 0,   96,  2, 4.0)
) AS p(dow, type, title, mins, km, elev, hr, effort, kcal_per_min)
-- Rest weeks happen: skip Wednesday rides every third week; never seed the future.
WHERE NOT (p.dow = 2 AND g % 3 = 1)
  AND date_trunc('week', now()) - g * interval '1 week' + p.dow * interval '1 day' + interval '6 hours 30 minutes' <= now()
ON CONFLICT (ext_ref) DO NOTHING;

-- A couple of standout efforts for the personal-records panel.
INSERT INTO workouts (ext_ref, athlete_id, type, title, started_at, duration_s, distance_m, elevation_m, avg_hr, effort, calories, notes)
SELECT r.ref, a.id, r.type, r.title, now() - r.ago, r.secs, r.metres, r.elev, r.hr, r.effort, r.kcal, r.notes
FROM (VALUES
  ('seed-pr-half', 'run',    'Bear Creek Half Marathon', interval '23 days', 5880, 21100, 180, 171, 9, 1420, 'New half PR! Negative split, felt strong after 15k.'),
  ('seed-pr-5k',   'sprint', 'Parkrun 5K',               interval '9 days',  1158, 5000,  15,  176, 9, 360,  'Sub-20 at last.'),
  ('seed-pr-hill', 'hills',  'Lookout Mountain repeats', interval '16 days', 4500, 12400, 910, 158, 8, 980,  '5 repeats, legs on fire.')
) AS r(ref, type, title, ago, secs, metres, elev, hr, effort, kcal, notes)
JOIN athletes a ON a.slug = 'sam-rivera'
ON CONFLICT (ext_ref) DO NOTHING;
