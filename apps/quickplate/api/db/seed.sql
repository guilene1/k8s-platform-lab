-- Idempotent seed data: restaurants.slug, menu_items(restaurant_id, slug) and
-- orders.code are UNIQUE, and every INSERT uses ON CONFLICT DO NOTHING.

INSERT INTO restaurants (slug, name, cuisine, tagline, neighborhood, image, rating, review_count,
                         prep_minutes, delivery_fee_cents, min_order_cents, price_level, sort_order) VALUES
  ('bangkok-street-kitchen', 'Bangkok Street Kitchen', 'Thai',      'Wok-fired, lime-bright, properly spicy.',      'Chinatown',     '/images/restaurants/bangkok-street-kitchen.jpg', 4.8, 1284, 18, 199, 1200, 1, 1),
  ('nonnas-pasta-bar',       'Nonna''s Pasta Bar',     'Italian',   'Hand-rolled every morning since 1994.',        'Little Italy',  '/images/restaurants/nonnas-pasta-bar.jpg',       4.9, 2210, 22, 249, 1500, 2, 2),
  ('patty-and-pickle',       'Patty & Pickle',         'Burgers',   'Smash burgers, house pickles, no shortcuts.',  'Mission',       '/images/restaurants/patty-and-pickle.jpg',       4.6, 987,  15, 149, 1000, 1, 3),
  ('greenhouse-bowls',       'Greenhouse Bowls',       'Healthy',   'Grain bowls that taste like a garden.',        'Riverside',     '/images/restaurants/greenhouse-bowls.jpg',       4.7, 640,  12, 99,  1000, 1, 4),
  ('antipasto-club',         'Antipasto Club',         'Italian',   'Cured, cheesy and made for sharing.',          'North Beach',   '/images/restaurants/antipasto-club.jpg',         4.5, 412,  14, 299, 2000, 3, 5),
  ('sunday-brunch-co',       'Sunday Brunch Co.',      'Brunch',    'Pancakes every day of the week.',              'Hayes Valley',  '/images/restaurants/sunday-brunch-co.jpg',       4.8, 1530, 16, 199, 1200, 2, 6),
  ('forage-kitchen',         'Forage Kitchen',         'Vegetarian','Mushrooms, roots and wild greens.',            'Dogpatch',      '/images/restaurants/forage-kitchen.jpg',         4.6, 377,  20, 199, 1500, 2, 7),
  ('ember-and-oak',          'Ember & Oak',            'Modern',    'Wood-fired plates from a tiny open kitchen.',  'SoMa',          '/images/restaurants/ember-and-oak.jpg',          4.9, 820,  28, 349, 2500, 3, 8),
  ('nordic-table',           'Nordic Table',           'Scandinavian','Open sandwiches and cured salmon.',          'Marina',        '/images/restaurants/nordic-table.jpg',           4.4, 288,  12, 249, 1500, 2, 9),
  ('mezze-lane',             'Mezze Lane',             'Mediterranean','Warm bread, cool dips, big table energy.',  'Castro',        '/images/restaurants/mezze-lane.jpg',             4.7, 1102, 17, 149, 1200, 1, 10)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO menu_items (restaurant_id, slug, section, name, description, price_cents, popular, vegetarian, spicy, sort_order)
SELECT r.id, m.slug, m.section, m.name, m.description, m.price, m.popular, m.veg, m.spicy, m.ord
FROM (SELECT v.*, row_number() OVER () AS ord FROM (VALUES
  ('bangkok-street-kitchen', 'pad-thai',        'Noodles', 'Pad Thai',            'Rice noodles, tamarind, peanuts, egg, bean sprouts.',     1450, true,  false, false),
  ('bangkok-street-kitchen', 'drunken-noodles', 'Noodles', 'Drunken Noodles',     'Wide noodles, holy basil, chilli, garlic.',               1550, true,  false, true),
  ('bangkok-street-kitchen', 'green-curry',     'Curries', 'Green Curry',         'Coconut, Thai eggplant, bamboo, jasmine rice.',           1650, false, false, true),
  ('bangkok-street-kitchen', 'massaman',        'Curries', 'Massaman Curry',      'Slow-cooked beef, potato, roasted peanuts.',              1750, false, false, false),
  ('bangkok-street-kitchen', 'som-tam',         'Small plates', 'Som Tam',        'Green papaya salad, lime, chilli, dried shrimp.',         1100, false, false, true),
  ('bangkok-street-kitchen', 'spring-rolls',    'Small plates', 'Crispy Spring Rolls', 'Glass noodles, cabbage, sweet chilli dip.',          850,  false, true,  false),
  ('nonnas-pasta-bar', 'tagliatelle-ragu',  'Pasta', 'Tagliatelle al Ragù',   'Six-hour beef and pork ragù, parmigiano.',                  1900, true,  false, false),
  ('nonnas-pasta-bar', 'cacio-e-pepe',      'Pasta', 'Cacio e Pepe',          'Tonnarelli, pecorino romano, cracked pepper.',              1650, true,  true,  false),
  ('nonnas-pasta-bar', 'pappardelle-funghi','Pasta', 'Pappardelle ai Funghi', 'Porcini, thyme, brown butter.',                             1850, false, true,  false),
  ('nonnas-pasta-bar', 'arrabbiata',        'Pasta', 'Penne all''Arrabbiata', 'Tomato, garlic, Calabrian chilli.',                         1450, false, true,  true),
  ('nonnas-pasta-bar', 'burrata',           'To start', 'Burrata',            'Heirloom tomatoes, basil oil, sourdough.',                  1400, false, true,  false),
  ('nonnas-pasta-bar', 'tiramisu',          'Dolci', 'Tiramisù',              'Mascarpone, espresso, cocoa.',                              900,  true,  true,  false),
  ('patty-and-pickle', 'double-smash',  'Burgers', 'Double Smash',        'Two patties, American cheese, pickles, sauce.',            1350, true,  false, false),
  ('patty-and-pickle', 'hot-honey',     'Burgers', 'Hot Honey Chicken',   'Buttermilk fried chicken, chilli honey, slaw.',            1400, true,  false, true),
  ('patty-and-pickle', 'garden-patty',  'Burgers', 'Garden Patty',        'Black bean & beet patty, avocado, sprouts.',               1300, false, true,  false),
  ('patty-and-pickle', 'fries',         'Sides',   'Hand-cut Fries',      'Twice fried, rosemary salt.',                              550,  true,  true,  false),
  ('patty-and-pickle', 'pickle-plate',  'Sides',   'House Pickle Plate',  'Dill, bread & butter, spicy carrots.',                     600,  false, true,  false),
  ('patty-and-pickle', 'shake',         'Drinks',  'Malted Vanilla Shake','Real vanilla, malt, whipped cream.',                       750,  false, true,  false),
  ('greenhouse-bowls', 'harvest-bowl',  'Bowls', 'Harvest Bowl',       'Roast squash, farro, kale, tahini, pepitas.',               1450, true,  true,  false),
  ('greenhouse-bowls', 'salmon-bowl',   'Bowls', 'Miso Salmon Bowl',   'Brown rice, edamame, avocado, pickled ginger.',             1750, true,  false, false),
  ('greenhouse-bowls', 'egg-avo',       'Bowls', 'Egg & Avo Bowl',     'Soft eggs, avocado, radish, greens, seeds.',               1350, false, true,  false),
  ('greenhouse-bowls', 'green-juice',   'Drinks', 'Green Juice',       'Cucumber, apple, celery, lemon, ginger.',                   700,  false, true,  false),
  ('greenhouse-bowls', 'chia-pot',      'Treats', 'Coconut Chia Pot',  'Mango, passion fruit, toasted coconut.',                    650,  false, true,  false),
  ('antipasto-club', 'board-classico', 'Boards', 'Board Classico',   'Prosciutto, salami, three cheeses, olives, focaccia.',        3400, true,  false, false),
  ('antipasto-club', 'caprese',        'Plates', 'Caprese',          'Buffalo mozzarella, tomato, basil.',                          1500, true,  true,  false),
  ('antipasto-club', 'arancini',       'Plates', 'Arancini',         'Saffron risotto, mozzarella, aioli.',                         1200, false, true,  false),
  ('antipasto-club', 'focaccia',       'Plates', 'Rosemary Focaccia','Sea salt, olive oil, whipped ricotta.',                       800,  false, true,  false),
  ('antipasto-club', 'cannoli',        'Dolci',  'Cannoli',          'Sheep ricotta, pistachio, orange.',                           900,  false, true,  false),
  ('sunday-brunch-co', 'stack',        'Pancakes', 'The Stack',          'Buttermilk pancakes, maple, whipped butter.',             1350, true,  true,  false),
  ('sunday-brunch-co', 'berry-stack',  'Pancakes', 'Berry Ricotta Stack','Ricotta pancakes, berries, honey.',                       1500, false, true,  false),
  ('sunday-brunch-co', 'benny',        'Eggs',     'Eggs Benedict',      'Poached eggs, ham, hollandaise, muffin.',                 1600, true,  false, false),
  ('sunday-brunch-co', 'shakshuka',    'Eggs',     'Shakshuka',          'Tomato, peppers, eggs, feta, sourdough.',                 1450, false, true,  true),
  ('sunday-brunch-co', 'fruit-bowl',   'Lighter',  'Market Fruit Bowl',  'Seasonal fruit, yogurt, granola.',                        1050, false, true,  false),
  ('sunday-brunch-co', 'cocoa',        'Drinks',   'Hot Chocolate',      'Single-origin cocoa, steamed milk.',                      550,  false, true,  false),
  ('forage-kitchen', 'mushroom-skillet', 'Mains', 'Wild Mushroom Skillet', 'Chanterelles, shallots, sherry, toast.',               1800, true,  true,  false),
  ('forage-kitchen', 'beet-tartare',     'Small plates', 'Beet Tartare',   'Capers, mustard, rye crisps.',                         1250, false, true,  false),
  ('forage-kitchen', 'root-gratin',      'Mains', 'Root Vegetable Gratin', 'Celeriac, parsnip, gruyère, thyme.',                   1650, true,  true,  false),
  ('forage-kitchen', 'nettle-soup',      'Small plates', 'Nettle Soup',    'Spring nettles, crème fraîche, chives.',               1050, false, true,  false),
  ('forage-kitchen', 'pear-tart',        'Sweets', 'Pear & Hazelnut Tart', 'Brown butter, vanilla cream.',                         900,  false, true,  false),
  ('ember-and-oak', 'charred-carrots', 'From the fire', 'Charred Carrots',   'Labneh, dukkah, honey.',                             1450, true,  true,  false),
  ('ember-and-oak', 'hanger-steak',    'From the fire', 'Hanger Steak',      'Chimichurri, smoked salt, fries.',                   3200, true,  false, false),
  ('ember-and-oak', 'half-chicken',    'From the fire', 'Half Chicken',      'Brined, wood-roasted, salsa verde.',                 2600, false, false, false),
  ('ember-and-oak', 'burnt-cheesecake','Dessert',       'Burnt Basque Cheesecake', 'Caramelised top, sherry cherries.',            1100, true,  true,  false),
  ('ember-and-oak', 'little-gem',      'Greens',        'Little Gem Salad',  'Anchovy dressing, crumbs, parmesan.',                1300, false, false, false),
  ('nordic-table', 'salmon-smorrebrod', 'Smørrebrød', 'Cured Salmon',     'Dill-cured salmon, cream cheese, capers, rye.',          1450, true,  false, false),
  ('nordic-table', 'egg-shrimp',        'Smørrebrød', 'Egg & Shrimp',     'Hand-peeled shrimp, egg, lemon mayo.',                   1400, false, false, false),
  ('nordic-table', 'potato-smorrebrod', 'Smørrebrød', 'New Potato',       'Crispy onions, chives, crème fraîche.',                  1150, true,  true,  false),
  ('nordic-table', 'meatballs',         'Warm',       'Swedish Meatballs','Lingonberry, pickled cucumber, mash.',                   1650, false, false, false),
  ('nordic-table', 'cardamom-bun',      'Fika',       'Cardamom Bun',     'Twisted, pearl sugar.',                                  550,  true,  true,  false),
  ('mezze-lane', 'mezze-for-two',  'Mezze', 'Mezze for Two',     'Hummus, baba ghanoush, muhammara, pita, pickles.',               2400, true,  true,  false),
  ('mezze-lane', 'falafel',        'Mezze', 'Herb Falafel',      'Tahini, pickled turnip, sumac onions.',                          1100, true,  true,  false),
  ('mezze-lane', 'lamb-kofta',     'Grill', 'Lamb Kofta',        'Charred kofta, yogurt, flatbread.',                              1850, false, false, true),
  ('mezze-lane', 'chicken-shish',  'Grill', 'Chicken Shish',     'Garlic toum, grilled peppers, rice.',                            1700, false, false, false),
  ('mezze-lane', 'fattoush',       'Salads', 'Fattoush',         'Crisp pita, purslane, pomegranate molasses.',                    1050, false, true,  false),
  ('mezze-lane', 'baklava',        'Sweets', 'Pistachio Baklava','Rose syrup, crushed pistachio.',                                 700,  false, true,  false)
) AS v(restaurant, slug, section, name, description, price, popular, veg, spicy)) AS m
JOIN restaurants r ON r.slug = m.restaurant
ON CONFLICT (restaurant_id, slug) DO NOTHING;

-- A sample order to track (code QP-7F3K2).
INSERT INTO orders (code, restaurant_id, customer_name, address, notes, subtotal_cents, delivery_fee_cents,
                    service_fee_cents, tip_cents, total_cents, eta_minutes, courier, created_at)
SELECT 'QP-7F3K2', r.id, 'Riley Chen', '220 Valencia St, Apt 4', 'Leave at the door', 4350, 249, 348, 500, 5447, 34, 'Marco', now() - interval '12 minutes'
FROM restaurants r WHERE r.slug = 'nonnas-pasta-bar'
ON CONFLICT (code) DO NOTHING;

INSERT INTO order_items (order_id, menu_item_id, name, price_cents, qty)
SELECT o.id, m.id, m.name, m.price_cents, i.qty
FROM (VALUES ('tagliatelle-ragu', 1), ('cacio-e-pepe', 1), ('tiramisu', 1)) AS i(slug, qty)
JOIN orders o ON o.code = 'QP-7F3K2'
JOIN menu_items m ON m.restaurant_id = o.restaurant_id AND m.slug = i.slug
ON CONFLICT (order_id, menu_item_id) DO NOTHING;
