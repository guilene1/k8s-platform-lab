-- Idempotent seed: specialties.slug, doctors.slug and appointments.code are
-- UNIQUE; every INSERT uses ON CONFLICT DO NOTHING.

INSERT INTO specialties (slug, name, description, sort_order) VALUES
  ('family-medicine', 'Family Medicine', 'Check-ups, prescriptions and everything in between.', 1),
  ('cardiology',      'Cardiology',      'Heart health, blood pressure and cholesterol.', 2),
  ('dermatology',     'Dermatology',     'Skin, hair and nail concerns, mole checks.', 3),
  ('pediatrics',      'Pediatrics',      'Care for babies, kids and teens.', 4),
  ('orthopedics',     'Orthopedics',     'Joints, sports injuries and back pain.', 5),
  ('mental-health',   'Mental Health',   'Therapy and psychiatry, in person or by video.', 6)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO doctors (slug, full_name, credentials, specialty_id, bio, photo, clinic, languages, years, rating, review_count,
                     weekdays, start_hour, end_hour, slot_minutes)
SELECT d.slug, d.name, d.cred, s.id, d.bio, d.photo, d.clinic, d.langs, d.years, d.rating, d.reviews, d.days, d.sh, d.eh, d.slot
FROM (VALUES
  ('dr-helen-marsh', 'Dr. Helen Marsh', 'MD, FAAFP', 'family-medicine',
   'Twenty-five years of family practice and a reputation for actually listening. Special interest in women''s health and healthy ageing.',
   '/images/doctors/dr-helen-marsh.jpg', 'Harbor Street Clinic', ARRAY['English'], 25, 4.9, 612, ARRAY[1,2,3,4], 8, 16, 30),
  ('dr-paul-brennan', 'Dr. Paul Brennan', 'MD, FACC', 'cardiology',
   'Interventional cardiologist who explains your heart in plain English. Runs the clinic''s blood-pressure programme.',
   '/images/doctors/dr-paul-brennan.jpg', 'Harbor Street Clinic', ARRAY['English','Irish'], 19, 4.8, 344, ARRAY[1,3,5], 9, 17, 30),
  ('dr-daniel-okafor', 'Dr. Daniel Okafor', 'MD', 'family-medicine',
   'Young-family and sports-medicine focus. Early mornings available for people who work nine to five.',
   '/images/doctors/dr-daniel-okafor.jpg', 'Riverside Health Centre', ARRAY['English','Igbo'], 8, 4.9, 288, ARRAY[1,2,3,4,5], 7, 15, 20),
  ('dr-sofia-reyes', 'Dr. Sofia Reyes', 'MD, FAAD', 'dermatology',
   'Board-certified dermatologist. Acne, eczema, skin cancer screening and kind, unhurried mole checks.',
   '/images/doctors/dr-sofia-reyes.jpg', 'Riverside Health Centre', ARRAY['English','Spanish'], 12, 4.9, 501, ARRAY[2,4,5], 10, 18, 30),
  ('dr-mei-tanaka', 'Dr. Mei Tanaka', 'MD, FAAP', 'pediatrics',
   'Pediatrician and mum of three. Newborn visits, vaccinations and the 2am questions you were too tired to ask.',
   '/images/doctors/dr-mei-tanaka.jpg', 'Harbor Street Clinic', ARRAY['English','Japanese'], 15, 5.0, 733, ARRAY[1,2,4,5], 8, 14, 20),
  ('dr-kwame-mensah', 'Dr. Kwame Mensah', 'MD, FAAOS', 'orthopedics',
   'Orthopedic surgeon who tries everything else first. Knees, shoulders, runners and weekend warriors.',
   '/images/doctors/dr-kwame-mensah.jpg', 'Northgate Sports Clinic', ARRAY['English','Twi'], 17, 4.7, 266, ARRAY[1,2,3], 9, 16, 30),
  ('dr-arjun-patel', 'Dr. Arjun Patel', 'MD, Psychiatry', 'mental-health',
   'Psychiatrist offering medication reviews and talk therapy. Evenings and video visits for privacy and convenience.',
   '/images/doctors/dr-arjun-patel.jpg', 'Video & Riverside', ARRAY['English','Hindi','Gujarati'], 11, 4.9, 198, ARRAY[2,3,4], 12, 20, 45),
  ('dr-laura-quinn', 'Dr. Laura Quinn', 'PsyD', 'mental-health',
   'Clinical psychologist specialising in anxiety, burnout and life transitions. Warm, practical, evidence-based.',
   '/images/doctors/dr-laura-quinn.jpg', 'Northgate Sports Clinic', ARRAY['English','French'], 9, 5.0, 154, ARRAY[1,3,5], 10, 18, 60)
) AS d(slug, name, cred, specialty, bio, photo, clinic, langs, years, rating, reviews, days, sh, eh, slot)
JOIN specialties s ON s.slug = d.specialty
ON CONFLICT (slug) DO NOTHING;

-- Sample appointment (look up CS-3107 with jamie.ruiz@example.com): the next
-- weekday 10:00 clinic time with Dr. Okafor (who works Monday-Friday).
INSERT INTO appointments (code, doctor_id, starts_at, patient_name, email, reason, visit_type)
SELECT 'CS-3107', d.id,
       (next_day + time '10:00') AT TIME ZONE 'America/New_York',
       'Jamie Ruiz', 'jamie.ruiz@example.com', 'Annual check-up', 'in-person'
FROM doctors d,
     -- ::date matters: generate_series over dates returns timestamptz, and
     -- (date + time) AT TIME ZONE must start from a zone-less timestamp.
     LATERAL (SELECT min(day)::date AS next_day FROM generate_series(current_date + 1, current_date + 7, interval '1 day') AS g(day)
              WHERE extract(isodow FROM day) BETWEEN 1 AND 5) nd
WHERE d.slug = 'dr-daniel-okafor'
ON CONFLICT (code) DO NOTHING;
