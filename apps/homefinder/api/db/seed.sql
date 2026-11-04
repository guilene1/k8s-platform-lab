-- Idempotent seed: listings.slug and photos(listing_id, file) are UNIQUE and
-- every INSERT uses ON CONFLICT DO NOTHING. The photo FILES are copied onto
-- the shared EFS volume at startup by the API (seedFiles, also idempotent).

INSERT INTO listings (slug, title, address, city, neighborhood, property_type, price_cents, beds, baths, sqft,
                      year_built, description, features, agent_name, status, listed_at) VALUES
  ('maple-row-brick', 'Red-brick family home on Maple Row', '14 Maple Row', 'Portland', 'Laurelhurst', 'house',
   89500000, 4, 2.5, 2380, 1928,
   'A symmetrical 1920s brick home with original oak floors, a sunlit chef''s kitchen and a deep garden backing onto the park.',
   ARRAY['Original oak floors','Two fireplaces','Detached garage','South-facing garden'], 'Dana Whitfield', 'for_sale', now() - interval '3 days'),
  ('cedar-cottage', 'Cedar Lane cottage with picket fence', '7 Cedar Lane', 'Portland', 'Sellwood', 'cottage',
   61500000, 2, 1.0, 1140, 1912,
   'Storybook cottage under maple trees: two bedrooms, a reading nook in every window and a kitchen garden already planted.',
   ARRAY['Picket fence','Kitchen garden','Clawfoot tub','Walk to river'], 'Dana Whitfield', 'for_sale', now() - interval '9 days'),
  ('meadow-farmhouse', 'White farmhouse on a quarter acre', '310 Meadow Road', 'Hood River', 'Odell', 'house',
   72000000, 3, 2.0, 1860, 1948,
   'A crisp white farmhouse surrounded by lawn and oaks, with a wraparound porch, mountain views and room for chickens.',
   ARRAY['Quarter-acre lot','Wraparound porch','Mt. Hood views','Workshop'], 'Luis Ortega', 'for_sale', now() - interval '1 day'),
  ('ivy-house', 'Ivy-clad house on Ashford Close', '22 Ashford Close', 'Seattle', 'Queen Anne', 'house',
   134000000, 5, 3.5, 3120, 1934,
   'Climbing ivy, leaded windows and a vintage-car-worthy driveway. Inside: five bedrooms, a library and a newly renovated kitchen.',
   ARRAY['Library','Renovated kitchen','Leaded windows','Two-car driveway'], 'Priya Raman', 'pending', now() - interval '21 days'),
  ('lilac-clapboard', 'Clapboard house in the lilacs', '58 Orchard Street', 'Seattle', 'Wallingford', 'house',
   98500000, 3, 2.0, 1980, 1908,
   'A white clapboard Victorian wrapped in lilac and dogwood, with bay windows, a sleeping porch and a sunny eat-in kitchen.',
   ARRAY['Bay windows','Sleeping porch','Mature garden','Basement studio'], 'Priya Raman', 'for_sale', now() - interval '5 days'),
  ('black-barns', 'Twin black barn houses', '1 Ridge Road', 'Bend', 'Tumalo', 'house',
   156000000, 4, 3.0, 2950, 2021,
   'Two architect-designed black timber barns joined by a glass link — one for living, one for guests or a studio. Big sky in every direction.',
   ARRAY['Architect designed','Guest barn','Radiant floors','Five-acre lot'], 'Luis Ortega', 'for_sale', now() - interval '2 days'),
  ('boathouse', 'Lakeside boathouse with private jetty', '3 Jetty Way', 'Lake Oswego', 'Lakewood', 'cottage',
   79000000, 1, 1.0, 860, 1965,
   'A restored boathouse on its own jetty: one bedroom, a wall of glass over the water and the best sunsets on the lake.',
   ARRAY['Private jetty','Water views','Fully restored','Kayak storage'], 'Dana Whitfield', 'for_sale', now() - interval '12 days'),
  ('foundry-loft', 'Foundry loft with steel windows', '400 Foundry St, #5B', 'Portland', 'Pearl District', 'loft',
   67500000, 2, 2.0, 1420, 1911,
   'Fourteen-foot ceilings, original steel windows and polished concrete in a converted 1911 foundry. Rooftop deck shared with six neighbours.',
   ARRAY['14 ft ceilings','Steel windows','Rooftop deck','Secure parking'], 'Mina Park', 'for_sale', now() - interval '6 days'),
  ('oak-panel-flat', 'Oak-panelled flat by the park', '19 Park Terrace, #2', 'Seattle', 'Capitol Hill', 'condo',
   54500000, 2, 1.0, 980, 1926,
   'Honey oak panelling, tall radiators and big windows onto Volunteer Park. A calm, characterful flat in a well-run building.',
   ARRAY['Oak panelling','Park views','Storage unit','Pet friendly'], 'Mina Park', 'for_sale', now() - interval '15 days')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO photos (listing_id, file, caption, source, position)
SELECT l.id, p.file, p.caption, 'seed', p.pos
FROM (VALUES
  ('maple-row-brick', 'maple-row-brick.jpg', 'Street view', 0),
  ('maple-row-brick', 'int-kitchen-island.jpg', 'Kitchen', 1),
  ('maple-row-brick', 'int-great-room.jpg', 'Family room', 2),
  ('cedar-cottage', 'cedar-cottage.jpg', 'Front garden', 0),
  ('cedar-cottage', 'int-living-green.jpg', 'Living room', 1),
  ('meadow-farmhouse', 'meadow-farmhouse.jpg', 'From the meadow', 0),
  ('meadow-farmhouse', 'int-dining-long.jpg', 'Dining', 1),
  ('meadow-farmhouse', 'int-kitchen-modern.jpg', 'Kitchen', 2),
  ('ivy-house', 'ivy-house.jpg', 'Front elevation', 0),
  ('ivy-house', 'int-great-room.jpg', 'Library', 1),
  ('lilac-clapboard', 'lilac-clapboard.jpg', 'In the lilacs', 0),
  ('lilac-clapboard', 'int-living-blue.jpg', 'Sitting room', 1),
  ('lilac-clapboard', 'int-dining-white.jpg', 'Breakfast room', 2),
  ('black-barns', 'black-barns.jpg', 'The barns', 0),
  ('black-barns', 'int-kitchen-modern.jpg', 'Kitchen', 1),
  ('boathouse', 'boathouse.jpg', 'At dusk', 0),
  ('boathouse', 'int-living-blue.jpg', 'Living space', 1),
  ('foundry-loft', 'foundry-loft.jpg', 'Main room', 0),
  ('foundry-loft', 'int-dining-white.jpg', 'Dining corner', 1),
  ('oak-panel-flat', 'oak-panel-flat.jpg', 'Reading corner', 0),
  ('oak-panel-flat', 'int-living-green.jpg', 'Living room', 1)
) AS p(slug, file, caption, pos)
JOIN listings l ON l.slug = p.slug
ON CONFLICT (listing_id, file) DO NOTHING;
