-- Idempotent seed: locations.slug, vehicles.slug and bookings.code are
-- UNIQUE; every INSERT uses ON CONFLICT DO NOTHING. Vehicle photo FILES are
-- copied onto the shared EFS volume at startup (seedFiles, idempotent).

INSERT INTO locations (slug, name, city, address, hours) VALUES
  ('sfo-mission', 'Mission Garage',      'San Francisco', '1200 Valencia St',     '7am – 9pm daily'),
  ('la-arts',     'Arts District Depot', 'Los Angeles',   '815 E 3rd St',         '7am – 10pm daily'),
  ('pdx-pearl',   'Pearl Street Lot',    'Portland',      '1010 NW Flanders St',  '8am – 8pm daily')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vehicles (slug, name, category, year, seats, transmission, fuel, daily_cents, location_id, photo_file, odometer_km, features, blurb)
SELECT v.slug, v.name, v.category, v.year, v.seats, v.trans, v.fuel, v.daily, l.id, v.photo, v.odo, v.features, v.blurb
FROM (VALUES
  ('havana-cruiser',    'Havana Cruiser',       'classic',     1956, 5, 'manual',    'petrol',   14900, 'la-arts',     'havana-cruiser.jpg',    182400, ARRAY['Bench seats','Chrome everything','Restored 2019'], 'A sunshine-yellow classic for the coast road. Turns heads at every light.'),
  ('coral-convertible', 'Coral Convertible',    'convertible', 1959, 4, 'automatic', 'petrol',   18900, 'la-arts',     'coral-convertible.jpg', 96500,  ARRAY['Soft top','Tail fins','Bluetooth retrofit'], 'Fins, chrome and a pink paint job made for Sunset Boulevard.'),
  ('grand-tourer',      'Grand Tourer Coupe',   'classic',     1968, 2, 'manual',    'petrol',   21500, 'sfo-mission', 'grand-tourer.jpg',      74200,  ARRAY['Wire wheels','Leather interior','Two-seater'], 'A long-bonnet grand tourer for the Pacific Coast Highway, top down or not.'),
  ('jade-saloon',       'Jade Saloon',          'sedan',       1972, 5, 'automatic', 'petrol',   12900, 'sfo-mission', 'jade-saloon.jpg',       131000, ARRAY['Walnut dash','Air conditioning','Big trunk'], 'A seafoam-green saloon with a walnut dashboard and a pillowy ride.'),
  ('summit-wagon',      'Summit Wagon',         'wagon',       2019, 5, 'automatic', 'hybrid',   8900,  'pdx-pearl',   'summit-wagon.jpg',      58300,  ARRAY['AWD','Roof box','Apple CarPlay'], 'All-wheel-drive wagon with a roof box. Gear for four, fuel for days.'),
  ('stargazer-4x4',     'Stargazer 4×4',        '4x4',         2021, 4, 'manual',    'petrol',   11900, 'la-arts',     'stargazer-4x4.jpg',     41200,  ARRAY['Removable roof','Off-road tyres','Recovery kit'], 'Take the roof off and drive to where the sky has more stars than lights.'),
  ('emerald-classic',   'Emerald Classic',      'classic',     1954, 6, 'automatic', 'petrol',   16900, 'pdx-pearl',   'emerald-classic.jpg',   203500, ARRAY['Column shifter','Whitewall tyres','Show winner'], 'A show-winning emerald cruiser with a grille that grins back at you.'),
  ('coastline-cabrio',  'Coastline Cabrio',     'convertible', 1994, 4, 'manual',    'petrol',   9900,  'sfo-mission', 'coastline-cabrio.jpg',  148900, ARRAY['Electric roof','Heated seats','Cassette deck'], 'A crisp white 90s cabriolet for golden-hour drives along the bay.'),
  ('roadtrip-suv',      'Roadtrip SUV',         'suv',         2022, 7, 'automatic', 'diesel',   10900, 'pdx-pearl',   'roadtrip-suv.jpg',      36100,  ARRAY['Seven seats','Roof rails','Adaptive cruise'], 'Seven seats, roof rails and enough range to reach the coast and back.'),
  ('harvest-estate',    'Harvest Estate',       'wagon',       1979, 5, 'manual',    'petrol',   7900,  'pdx-pearl',   'harvest-estate.jpg',    221000, ARRAY['Roof rack','Bench rear','Character'], 'A rust-red estate with a roof rack and a lot of stories.'),
  ('mist-coupe',        'Mist Coupe',           'compact',     2017, 4, 'automatic', 'petrol',   6900,  'sfo-mission', 'mist-coupe.jpg',        64800,  ARRAY['Great on fuel','Easy to park','USB-C'], 'A nimble coupe that fits anywhere in the city and sips fuel.'),
  ('ivory-sedan',       'Ivory Sedan',          'sedan',       1981, 5, 'manual',    'petrol',   8900,  'la-arts',     'ivory-sedan.jpg',       189300, ARRAY['Bench front seat','Chrome bumpers','Big comfy ride'], 'An ivory four-door from the Eastern Bloc, built like a tank and twice as charming.')
) AS v(slug, name, category, year, seats, trans, fuel, daily, loc, photo, odo, features, blurb)
JOIN locations l ON l.slug = v.loc
ON CONFLICT (slug) DO NOTHING;

-- Sample bookings (look up DN-5150 with alex.kim@example.com).
INSERT INTO bookings (code, vehicle_id, driver_name, email, pickup_date, return_date, days, total_cents, status)
SELECT b.code, v.id, b.name, b.email, current_date + b.start_in, current_date + b.start_in + b.days, b.days, v.daily_cents * b.days, b.status
FROM (VALUES
  ('DN-5150', 'grand-tourer',   'Alex Kim',     'alex.kim@example.com',     3, 4, 'reserved'),
  ('DN-5151', 'summit-wagon',   'Rosa Delgado', 'rosa.delgado@example.com', 6, 3, 'reserved'),
  ('DN-5152', 'havana-cruiser', 'Tom Becker',   'tom.becker@example.com',   10, 2, 'reserved')
) AS b(code, vehicle, name, email, start_in, days, status)
JOIN vehicles v ON v.slug = b.vehicle
ON CONFLICT DO NOTHING;
