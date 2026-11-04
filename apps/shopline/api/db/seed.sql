-- Idempotent seed data. Runs on every API start; every INSERT relies on a
-- UNIQUE constraint (categories.slug, products.slug, orders.number, the
-- order_items primary key) so re-runs never duplicate rows.

INSERT INTO categories (slug, name, tagline, sort_order) VALUES
  ('bags',        'Bags',        'Built to carry a life, not just a laptop.',       1),
  ('watches',     'Watches',     'Quiet faces. Honest movements.',                  2),
  ('eyewear',     'Eyewear',     'For long afternoons and bright mornings.',        3),
  ('outerwear',   'Outerwear',   'Layers that only get better with age.',           4),
  ('footwear',    'Footwear',    'Made to be walked in, again and again.',          5),
  ('home',        'Home',        'Small rituals, beautifully made.',                6)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (slug, name, category_id, price_cents, description, details, image, stock, badge, featured)
SELECT p.slug, p.name, c.id, p.price_cents, p.description, p.details, p.image, p.stock, p.badge, p.featured
FROM (VALUES
  ('heritage-duffel', 'Heritage Leather Duffel', 'bags', 34500,
   'Full-grain leather that darkens and softens with every trip. Two end pockets, brass hardware and a detachable shoulder strap.',
   ARRAY['Full-grain vegetable-tanned leather','Solid brass hardware','52 × 28 × 26 cm, 38 L','Cotton canvas lining'],
   '/images/products/heritage-duffel.jpg', 14, 'Bestseller', true),
  ('canvas-weekender', 'Canvas Weekender', 'bags', 16800,
   'Waxed cotton canvas with leather trim — light enough to fold, tough enough for the overhead bin.',
   ARRAY['18 oz waxed canvas','Leather handles and base patch','46 × 25 × 24 cm, 30 L'],
   '/images/products/canvas-weekender.jpg', 30, NULL, false),
  ('field-backpack', 'Mustard Field Backpack', 'bags', 12900,
   'A flap-top daypack with a padded laptop sleeve and two magnetic closures. Fits a 15" laptop and a long day.',
   ARRAY['Water-resistant cotton duck','Padded 15" laptop sleeve','22 L'],
   '/images/products/field-backpack.jpg', 42, 'New', true),
  ('saddle-messenger', 'Saddle Messenger', 'bags', 21900,
   'Hand-stitched messenger in saddle-tan leather, sized for a tablet, a notebook and a good pen.',
   ARRAY['Hand-stitched saddle leather','Adjustable strap','34 × 26 × 9 cm'],
   '/images/products/saddle-messenger.jpg', 9, NULL, false),
  ('classic-chronograph', 'Classic Chronograph', 'watches', 28900,
   'A 42 mm chronograph with a slate dial, luminous hands and a tan leather strap that patinas beautifully.',
   ARRAY['42 mm stainless case','Sapphire crystal','10 ATM water resistance','Quick-release leather strap'],
   '/images/products/classic-chronograph.jpg', 18, 'Bestseller', true),
  ('minimal-white-dial', 'Minimal White Dial', 'watches', 19900,
   'Nothing extra: a clean white dial, slim hands, date at three. Pairs with everything you own.',
   ARRAY['40 mm brushed case','Japanese quartz movement','Italian leather strap'],
   '/images/products/minimal-white-dial.jpg', 25, NULL, false),
  ('rose-gold-bracelet', 'Rose Gold Bracelet Watch', 'watches', 23900,
   'A 36 mm case on a link bracelet in warm rose-gold tone — part watch, part jewellery.',
   ARRAY['36 mm case','Rose-gold PVD steel','Adjustable link bracelet'],
   '/images/products/rose-gold-bracelet.jpg', 11, 'Limited', false),
  ('noir-wayfarer', 'Noir Wayfarer', 'eyewear', 14500,
   'Hand-polished acetate frames with polarised lenses. The shape you already know, done properly.',
   ARRAY['Italian acetate','Polarised CR-39 lenses','100% UVA/UVB protection'],
   '/images/products/noir-wayfarer.jpg', 36, NULL, true),
  ('rose-round', 'Rose Round', 'eyewear', 12500,
   'Lightweight round frames with gradient rose lenses for soft-focus summer days.',
   ARRAY['Titanium-alloy frame','Gradient lenses','Spring hinges'],
   '/images/products/rose-round.jpg', 22, 'New', false),
  ('ivory-frame', 'Ivory Square Frame', 'eyewear', 13500,
   'Chunky ivory acetate with bronze-tinted lenses. A statement that still feels calm.',
   ARRAY['Bio-acetate','Bronze-tinted lenses','Includes leather case'],
   '/images/products/ivory-frame.jpg', 15, NULL, false),
  ('washed-denim-jacket', 'Washed Denim Jacket', 'outerwear', 15800,
   'Twelve-ounce selvedge denim, washed once for a lived-in feel from day one.',
   ARRAY['12 oz selvedge denim','Corozo buttons','Relaxed fit'],
   '/images/products/washed-denim-jacket.jpg', 27, NULL, true),
  ('shearling-parka', 'Shearling-Trim Parka', 'outerwear', 39500,
   'A down-filled parka with a generous shearling-trim hood. Rated for proper winters.',
   ARRAY['Responsibly sourced down','Water-repellent shell','Detachable trim'],
   '/images/products/shearling-parka.jpg', 8, 'Limited', true),
  ('navy-low-top', 'Navy Canvas Low-Top', 'footwear', 8900,
   'Vulcanised rubber sole, heavyweight cotton canvas, cushioned footbed. A sneaker for every day of the week.',
   ARRAY['Heavyweight cotton canvas','Vulcanised rubber sole','Cushioned cork footbed'],
   '/images/products/navy-low-top.jpg', 60, NULL, false),
  ('sunburst-mug', 'Sunburst Stripe Mug', 'home', 2800,
   'Hand-glazed stoneware with a sunny yellow stripe. Holds a generous 350 ml.',
   ARRAY['Hand-glazed stoneware','350 ml','Dishwasher safe'],
   '/images/products/sunburst-mug.jpg', 120, NULL, false),
  ('stoneware-teapot', 'Crimson Teapot Set', 'home', 7400,
   'A glossy crimson teapot with two matching cups, for slow mornings on the balcony.',
   ARRAY['Stoneware','900 ml teapot + 2 cups','Stainless infuser'],
   '/images/products/stoneware-teapot.jpg', 19, 'New', true),
  ('speckled-camp-mug', 'Speckled Camp Mug', 'home', 3200,
   'Kiln-speckled blue glaze that looks as good by the fire as it does on your desk.',
   ARRAY['Speckled reactive glaze','400 ml','Each one is unique'],
   '/images/products/speckled-camp-mug.jpg', 75, NULL, false)
) AS p(slug, name, category, price_cents, description, details, image, stock, badge, featured)
JOIN categories c ON c.slug = p.category
ON CONFLICT (slug) DO NOTHING;

-- A few past orders so order tracking has something to show
-- (look up SL-10042 with ava.chen@example.com).
INSERT INTO orders (number, email, full_name, address, city, postal_code, country,
                    subtotal_cents, shipping_cents, total_cents, created_at) VALUES
  ('SL-10042', 'ava.chen@example.com', 'Ava Chen', '18 Harbour Street', 'Seattle', '98101', 'United States',
   49000, 0, 49000, now() - interval '3 days'),
  ('SL-10043', 'marcus.oduya@example.com', 'Marcus Oduya', '7 Elm Row', 'Austin', '73301', 'United States',
   14500, 900, 15400, now() - interval '1 day'),
  ('SL-10044', 'ava.chen@example.com', 'Ava Chen', '18 Harbour Street', 'Seattle', '98101', 'United States',
   10200, 900, 11100, now() - interval '2 hours')
ON CONFLICT (number) DO NOTHING;

INSERT INTO order_items (order_id, product_id, name, image, price_cents, qty)
SELECT o.id, p.id, p.name, p.image, p.price_cents, i.qty
FROM (VALUES
  ('SL-10042', 'heritage-duffel', 1),
  ('SL-10042', 'noir-wayfarer', 1),
  ('SL-10043', 'noir-wayfarer', 1),
  ('SL-10044', 'sunburst-mug', 1),
  ('SL-10044', 'stoneware-teapot', 1)
) AS i(number, slug, qty)
JOIN orders o   ON o.number = i.number
JOIN products p ON p.slug = i.slug
ON CONFLICT (order_id, product_id) DO NOTHING;
