-- Idempotent seed: venues.slug, events.slug, orders.code, tickets.code and
-- tickets(event_id, seat_row, seat_number) are UNIQUE; every INSERT uses
-- ON CONFLICT DO NOTHING. Event dates are relative to the first run.

INSERT INTO venues (slug, name, city, timezone, row_count, seats_per_row) VALUES
  ('the-foundry',     'The Foundry',        'Brooklyn',    'America/New_York',    10, 16),
  ('glasshouse-hall', 'Glasshouse Hall',    'Chicago',     'America/Chicago',     12, 18),
  ('harbor-arena',    'Harbor Arena',       'Oakland',     'America/Los_Angeles', 12, 20),
  ('blue-room',       'The Blue Room',      'New Orleans', 'America/Chicago',      8, 12)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO events (slug, title, artist, genre, venue_id, starts_at, image, description,
                    front_price_cents, mid_price_cents, back_price_cents)
-- Doors at the given local time, in the venue's own time zone.
SELECT e.slug, e.title, e.artist, e.genre, v.id, ((current_date + e.days) + e.at::time) AT TIME ZONE v.timezone,
       e.image, e.descr, e.front, e.mid, e.back
FROM (VALUES
  ('neon-riot',            'Neon Riot — Live',          'Neon Riot',            'Rock',       'the-foundry',     4,  '20:00', '/images/events/neon-riot.jpg',
   'Sweat, feedback and the loudest chorus in Brooklyn. The local heroes return for one night only.', 6500, 4800, 3500),
  ('afterglow-tour',       'The Afterglow Tour',        'Kaya Lune',            'Pop',        'harbor-arena',    9,  '19:30', '/images/events/afterglow-tour.jpg',
   'A wall of light and two hours of hits. Kaya Lune brings the Afterglow show to the bay.', 12900, 8900, 5900),
  ('blue-hour-band',       'Blue Hour',                 'The Blue Hour Band',   'Indie',      'glasshouse-hall', 6,  '20:30', '/images/events/blue-hour-band.jpg',
   'Shimmering guitars, two-part harmonies and a light show tuned to every song.', 5500, 4200, 3200),
  ('symphony-under-glass', 'Symphony Under Glass',      'Lakeshore Philharmonic','Classical', 'glasshouse-hall', 14, '19:00', '/images/events/symphony-under-glass.jpg',
   'Dvořák''s New World Symphony beneath the hall''s glass roof, as the sun goes down over the lake.', 9500, 6900, 4500),
  ('late-night-jazz',      'Late Night Jazz Session',   'The Marigny Seven',    'Jazz',       'blue-room',       2,  '22:00', '/images/events/late-night-jazz.jpg',
   'Brass, bourbon and improvisation until the small hours. A New Orleans institution.', 4500, 3500, 2500),
  ('solo-violin',          'Solo: An Evening of Bach',  'Mira Castellanos',     'Classical',  'blue-room',       11, '19:30', '/images/events/solo-violin.jpg',
   'The complete partitas, played alone on a single stage light. Intimate, astonishing, unforgettable.', 7500, 5500, 3900),
  ('wildfire-festival',    'Wildfire Night',            'Various Artists',      'Electronic', 'harbor-arena',    18, '21:00', '/images/events/wildfire-festival.jpg',
   'Six DJs, one enormous stage and a pyrotechnic finale. The biggest dance night of the season.', 9900, 7400, 4900),
  ('laser-district',       'Laser District',            'Volt & Vector',        'Electronic', 'the-foundry',     7,  '23:00', '/images/events/laser-district.jpg',
   'Modular synths, a laser rig the size of the room and a set that runs until 3am.', 5900, 4500, 3200),
  ('amber-folk',           'Amber Light',               'Juniper Hale',         'Folk',       'the-foundry',     21, '20:00', '/images/events/amber-folk.jpg',
   'Stories, banjo and a voice like warm honey. Juniper Hale''s first headline tour.', 4200, 3200, 2400),
  ('cello-lightworks',     'Cello Lightworks',          'Oskar Brandt',         'Classical',  'glasshouse-hall', 25, '20:00', '/images/events/cello-lightworks.jpg',
   'Solo cello meets a choreographed beam show — the instrument like you have never heard it.', 6900, 5200, 3600)
) AS e(slug, title, artist, genre, venue, days, at, image, descr, front, mid, back)
JOIN venues v ON v.slug = e.venue
ON CONFLICT (slug) DO NOTHING;

-- Pre-sold seats so the maps look like a real on-sale: one bulk "box office"
-- order per event and roughly a quarter of the seats taken (front rows more).
INSERT INTO orders (code, event_id, buyer_name, email, total_cents)
SELECT 'BOX-' || e.slug, e.id, 'Box office', 'boxoffice@example.com', 0 FROM events e
ON CONFLICT (code) DO NOTHING;

INSERT INTO tickets (code, order_id, event_id, seat_row, seat_number, price_cents)
SELECT 'BOX-' || e.id || '-' || chr(64 + r) || n, o.id, e.id, chr(64 + r), n, e.mid_price_cents
FROM events e
JOIN venues v ON v.id = e.venue_id
JOIN orders o ON o.code = 'BOX-' || e.slug
CROSS JOIN LATERAL generate_series(1, v.row_count) AS r
CROSS JOIN LATERAL generate_series(1, v.seats_per_row) AS n
WHERE (r * 7 + n * 3 + e.id * 5) % (CASE WHEN r <= 3 THEN 2 ELSE 5 END) = 0
ON CONFLICT DO NOTHING;

-- A sample order to look up: TW-8K2P4 / dev.patel@example.com
INSERT INTO orders (code, event_id, buyer_name, email, total_cents, fees_cents)
SELECT 'TW-8K2P4', e.id, 'Dev Patel', 'dev.patel@example.com', 2 * e.mid_price_cents + 2 * 450, 900
FROM events e WHERE e.slug = 'late-night-jazz'
ON CONFLICT (code) DO NOTHING;

INSERT INTO tickets (code, order_id, event_id, seat_row, seat_number, price_cents)
SELECT s.code, o.id, o.event_id, s.r, s.n, e.mid_price_cents
FROM (VALUES ('TW-8K2P4-1', 'E', 6), ('TW-8K2P4-2', 'E', 7)) AS s(code, r, n)
JOIN orders o ON o.code = 'TW-8K2P4'
JOIN events e ON e.id = o.event_id
ON CONFLICT DO NOTHING;
