-- Idempotent seed: hotels.slug, room_types(hotel_id, slug) and
-- reservations.code are UNIQUE; every INSERT uses ON CONFLICT DO NOTHING.

INSERT INTO hotels (slug, name, city, country, summary, description, image, stars, rating, review_count, amenities, sort_order) VALUES
  ('the-palmera', 'The Palmera', 'Miami', 'United States',
   'Pastel art-deco calm, two blocks from the sand.',
   'A restored 1938 tower wrapped in palms, with a rooftop pool, a quiet library bar and rooms painted the colours of a Florida sunset.',
   '/images/hotels/the-palmera.jpg', 4, 4.7, 1824, ARRAY['Rooftop pool','Beach shuttle','Free Wi-Fi','Cocktail bar','Bike hire'], 1),
  ('copacabana-sky', 'Copacabana Sky', 'Rio de Janeiro', 'Brazil',
   'An infinity pool that seems to pour into the Atlantic.',
   'Floor-to-ceiling views of Sugarloaf and the bay from every room, a glass-edged pool deck and a caipirinha bar that never closes.',
   '/images/hotels/copacabana-sky.jpg', 5, 4.8, 2410, ARRAY['Infinity pool','Spa','Ocean views','Fitness centre','Airport transfer'], 2),
  ('alpenrose-lodge', 'Alpenrose Lodge', 'Hallstatt', 'Austria',
   'A lakeside chalet where the mountains do the talking.',
   'Timber rooms that look straight onto the lake, a wood-fired sauna and breakfasts of warm rye bread and alpine butter.',
   '/images/hotels/alpenrose-lodge.jpg', 4, 4.9, 736, ARRAY['Lake access','Sauna','Breakfast included','Hiking guides','Fireplace lounge'], 3),
  ('harbour-and-mews', 'Harbour & Mews', 'London', 'United Kingdom',
   'Street art outside, Savile Row tailoring inside.',
   'A Victorian warehouse turned design hotel, wrapped in a mural by local artists, with a basement jazz room and a proper full English.',
   '/images/hotels/harbour-and-mews.jpg', 4, 4.6, 1290, ARRAY['Jazz bar','24h reception','Free Wi-Fi','Pet friendly','Bike hire'], 4),
  ('maison-lumiere', 'Maison Lumière', 'Paris', 'France',
   'Haussmann elegance on a quiet Left Bank street.',
   'Sixteen rooms behind a limestone façade, tall windows over the rooftops and a courtyard where breakfast arrives on silver trays.',
   '/images/hotels/maison-lumiere.jpg', 5, 4.9, 958, ARRAY['Courtyard breakfast','Concierge','Champagne bar','Free Wi-Fi','Turndown service'], 5),
  ('coral-bay-resort', 'Coral Bay Resort', 'Nassau', 'Bahamas',
   'White sand, turquoise water and absolutely nothing to do.',
   'A barefoot resort on its own crescent of beach, with snorkelling off the jetty, three pools and a lagoon you can wade across.',
   '/images/hotels/coral-bay-resort.jpg', 5, 4.7, 3105, ARRAY['Private beach','Three pools','Snorkelling','Kids club','All-inclusive option'], 6),
  ('larchwood-manor', 'Larchwood Manor', 'Cotswolds', 'United Kingdom',
   'A country house at the end of a long, leafy lane.',
   'Eleven rooms in a Georgian manor surrounded by beech woods, with a walled kitchen garden that supplies the restaurant.',
   '/images/hotels/larchwood-manor.jpg', 4, 4.8, 512, ARRAY['Kitchen garden','Restaurant','Woodland walks','Free parking','Fireplace lounge'], 7),
  ('glacier-house', 'Glacier House', 'Zermatt', 'Switzerland',
   'Ski-in mornings, fondue nights, peak views in between.',
   'A modern alpine lodge with a dining room facing the mountains, heated boot rooms and a spa carved into the rock.',
   '/images/hotels/glacier-house.jpg', 5, 4.9, 844, ARRAY['Ski-in/ski-out','Spa','Mountain views','Restaurant','Boot room'], 8)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO room_types (hotel_id, slug, name, image, bed, max_guests, size_m2, nightly_cents, inventory, features)
SELECT h.id, r.slug, r.name, r.image, r.bed, r.guests, r.size, r.price, r.inventory, r.features
FROM (VALUES
  ('the-palmera', 'deco-double', 'Deco Double', '/images/rooms/classic-double.jpg', '1 queen bed', 2, 24, 21900, 6, ARRAY['City view','Rain shower','Minibar']),
  ('the-palmera', 'sunset-suite', 'Sunset Suite', '/images/rooms/violet-king.jpg', '1 king bed', 3, 42, 38900, 2, ARRAY['Ocean view','Balcony','Soaking tub']),
  ('copacabana-sky', 'bay-king', 'Bay View King', '/images/rooms/city-view.jpg', '1 king bed', 2, 32, 34500, 8, ARRAY['Bay view','Floor-to-ceiling windows','Nespresso']),
  ('copacabana-sky', 'sky-suite', 'Sky Suite', '/images/rooms/balcony-suite.jpg', '1 king + sofa bed', 4, 65, 62000, 2, ARRAY['Wraparound balcony','Living room','Butler service']),
  ('alpenrose-lodge', 'lakeside-double', 'Lakeside Double', '/images/rooms/classic-double.jpg', '1 double bed', 2, 22, 18900, 5, ARRAY['Lake view','Wood floors','Breakfast']),
  ('alpenrose-lodge', 'family-chalet', 'Family Chalet Room', '/images/rooms/bright-studio.jpg', '1 queen + 2 singles', 4, 38, 29900, 3, ARRAY['Mountain view','Kitchenette','Breakfast']),
  ('harbour-and-mews', 'loft-king', 'Warehouse Loft King', '/images/rooms/work-suite.jpg', '1 king bed', 2, 28, 24900, 7, ARRAY['Exposed brick','Work desk','Record player']),
  ('harbour-and-mews', 'mews-studio', 'Mews Studio', '/images/rooms/bright-studio.jpg', '1 queen bed', 2, 30, 27900, 3, ARRAY['Kitchenette','Courtyard view','Pet friendly']),
  ('maison-lumiere', 'classique', 'Chambre Classique', '/images/rooms/city-view.jpg', '1 queen bed', 2, 20, 32000, 6, ARRAY['Rooftop view','Marble bath','Nespresso']),
  ('maison-lumiere', 'balcon-suite', 'Suite Balcon', '/images/rooms/balcony-suite.jpg', '1 king bed', 3, 40, 54000, 2, ARRAY['Juliet balcony','Living area','Champagne on arrival']),
  ('coral-bay-resort', 'garden-room', 'Garden Room', '/images/rooms/bright-studio.jpg', '2 queen beds', 4, 36, 29500, 10, ARRAY['Garden terrace','Beach towels','Ceiling fan']),
  ('coral-bay-resort', 'beach-villa', 'Beachfront Villa', '/images/rooms/violet-king.jpg', '1 king bed', 3, 70, 68000, 2, ARRAY['Steps to the sand','Plunge pool','Outdoor shower']),
  ('larchwood-manor', 'manor-double', 'Manor Double', '/images/rooms/classic-double.jpg', '1 double bed', 2, 26, 22500, 6, ARRAY['Garden view','Roll-top bath','Breakfast']),
  ('larchwood-manor', 'library-suite', 'Library Suite', '/images/rooms/work-suite.jpg', '1 king bed', 2, 44, 36500, 1, ARRAY['Private library','Fireplace','Breakfast']),
  ('glacier-house', 'peak-king', 'Peak View King', '/images/rooms/city-view.jpg', '1 king bed', 2, 30, 42000, 6, ARRAY['Matterhorn view','Heated floors','Ski storage']),
  ('glacier-house', 'alpine-suite', 'Alpine Suite', '/images/rooms/balcony-suite.jpg', '1 king + bunk beds', 5, 58, 71000, 2, ARRAY['Balcony','Fireplace','Spa access'])
) AS r(hotel, slug, name, image, bed, guests, size, price, inventory, features)
JOIN hotels h ON h.slug = r.hotel
ON CONFLICT (hotel_id, slug) DO NOTHING;

-- Sample reservations (look up SW-4821 with noor.haddad@example.com).
INSERT INTO reservations (code, room_type_id, guest_name, email, check_in, check_out, guests, nights, total_cents)
SELECT r.code, rt.id, r.guest, r.email, current_date + r.offset_days, current_date + r.offset_days + r.nights, r.guests, r.nights, rt.nightly_cents * r.nights
FROM (VALUES
  ('SW-4821', 'alpenrose-lodge', 'lakeside-double', 'Noor Haddad', 'noor.haddad@example.com', 12, 3, 2),
  ('SW-4822', 'larchwood-manor', 'library-suite', 'Theo Lambert', 'theo.lambert@example.com', 5, 2, 2),
  ('SW-4823', 'maison-lumiere', 'balcon-suite', 'Ines Moreau', 'ines.moreau@example.com', 20, 4, 2)
) AS r(code, hotel, room, guest, email, offset_days, nights, guests)
JOIN hotels h ON h.slug = r.hotel
JOIN room_types rt ON rt.hotel_id = h.id AND rt.slug = r.room
ON CONFLICT (code) DO NOTHING;
