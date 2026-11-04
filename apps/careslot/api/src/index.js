// CareSlot API - doctors, live availability and appointment booking.
//
// Slots are generated from each doctor's weekly schedule (in the clinic's
// time zone); a slot is free unless a booked appointment holds it. A partial
// UNIQUE index (doctor_id, starts_at WHERE status='booked') makes double
// booking impossible even under concurrent requests.
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { start, badRequest, notFound, conflict } from '../kit/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const CLINIC_TZ = 'America/New_York';
const LUNCH = [12, 13]; // no appointments 12:00-13:00

// All slots for one doctor over the next $2 days ($1 = doctor id).
const SLOTS_SQL = `
  WITH d AS (SELECT * FROM doctors WHERE id = $1),
  days AS (
    SELECT (now() AT TIME ZONE '${CLINIC_TZ}')::date + i AS day FROM generate_series(0, $2::int - 1) AS i
  ),
  slots AS (
    SELECT ((days.day + make_interval(mins => m)) AT TIME ZONE '${CLINIC_TZ}') AS starts_at, days.day
      FROM d, days, generate_series(d.start_hour * 60, d.end_hour * 60 - d.slot_minutes, d.slot_minutes) AS m
     WHERE extract(isodow FROM days.day) = ANY (d.weekdays)
       AND NOT (m >= ${LUNCH[0] * 60} AND m < ${LUNCH[1] * 60})
  )
  SELECT s.starts_at, to_char(s.day, 'YYYY-MM-DD') AS day,
         to_char(s.starts_at AT TIME ZONE '${CLINIC_TZ}', 'HH24:MI') AS local_time,
         EXISTS (SELECT 1 FROM appointments a, d WHERE a.doctor_id = d.id AND a.starts_at = s.starts_at AND a.status = 'booked') AS taken
    FROM slots s
   WHERE s.starts_at > now() + interval '1 hour'
   ORDER BY s.starts_at`;

const DOCTOR_SELECT = `SELECT d.id, d.slug, d.full_name, d.credentials, d.bio, d.photo, d.clinic, d.languages, d.years,
    d.rating, d.review_count, d.weekdays, d.start_hour, d.end_hour, d.slot_minutes, d.accepting_new,
    s.slug AS specialty, s.name AS specialty_name
  FROM doctors d JOIN specialties s ON s.id = d.specialty_id`;

const shape = (d) => ({ ...d, rating: Number(d.rating) });

await start({
  name: 'careslot',
  migrationsDir: path.join(here, '../db/migrations'),
  seedFile: path.join(here, '../db/seed.sql'),

  routes(api, { db }) {
    api.get('/specialties', async (_req, res) => {
      const { rows } = await db.query(
        `SELECT s.slug, s.name, s.description, count(d.id)::int AS doctors
           FROM specialties s LEFT JOIN doctors d ON d.specialty_id = s.id GROUP BY s.id ORDER BY s.sort_order`);
      res.json(rows);
    });

    api.get('/doctors', async (req, res) => {
      const params = [];
      const where = [];
      if (req.query.specialty) { params.push(String(req.query.specialty)); where.push(`s.slug = $${params.length}`); }
      if (req.query.q) { params.push(`%${String(req.query.q).slice(0, 60)}%`); where.push(`(d.full_name ILIKE $${params.length} OR s.name ILIKE $${params.length})`); }
      const { rows } = await db.query(`${DOCTOR_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY d.rating DESC, d.review_count DESC`, params);
      // First free slot for each doctor (handy on the list page).
      const out = [];
      for (const d of rows) {
        const next = await db.query(`SELECT * FROM (${SLOTS_SQL}) x WHERE NOT taken LIMIT 1`, [d.id, 14]);
        out.push({ ...shape(d), next_available: next.rows[0]?.starts_at || null });
      }
      res.json(out);
    });

    api.get('/doctors/:slug', async (req, res) => {
      const { rows } = await db.query(`${DOCTOR_SELECT} WHERE d.slug = $1`, [req.params.slug]);
      if (!rows.length) throw notFound('Doctor not found');
      res.json({ ...shape(rows[0]), timezone: CLINIC_TZ });
    });

    api.get('/doctors/:slug/availability', async (req, res) => {
      const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 21);
      const d = await db.query('SELECT id FROM doctors WHERE slug = $1', [req.params.slug]);
      if (!d.rowCount) throw notFound('Doctor not found');
      const { rows } = await db.query(SLOTS_SQL, [d.rows[0].id, days]);
      const byDay = {};
      for (const r of rows) (byDay[r.day] ||= []).push({ starts_at: r.starts_at, time: r.local_time, taken: r.taken });
      res.json({ timezone: CLINIC_TZ, days: Object.entries(byDay).map(([day, slots]) => ({ day, slots })) });
    });

    api.post('/appointments', async (req, res) => {
      const b = req.body || {};
      const name = String(b.patient_name || '').trim();
      const email = String(b.email || '').trim().toLowerCase();
      if (!name) throw badRequest('Please enter the patient’s name');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest('Please enter a valid email');
      const visit = b.visit_type === 'video' ? 'video' : 'in-person';
      const when = new Date(b.starts_at);
      if (Number.isNaN(when.getTime())) throw badRequest('Pick a time slot');

      const d = await db.query('SELECT id, full_name, accepting_new FROM doctors WHERE slug = $1', [b.doctor]);
      if (!d.rowCount) throw notFound('Doctor not found');
      // The requested time must be one of this doctor's real, future slots.
      const valid = await db.query(`SELECT taken FROM (${SLOTS_SQL}) x WHERE starts_at = $3`, [d.rows[0].id, 21, when.toISOString()]);
      if (!valid.rowCount) throw badRequest('That time is not one of Dr. ' + d.rows[0].full_name.split(' ').pop() + '’s slots');
      if (valid.rows[0].taken) throw conflict('Sorry — that slot was just taken. Please pick another.');

      const code = `CS-${crypto.randomInt(1000, 9999)}${crypto.randomInt(10)}`;
      try {
        await db.query(
          `INSERT INTO appointments (code, doctor_id, starts_at, patient_name, email, reason, visit_type)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [code, d.rows[0].id, when.toISOString(), name.slice(0, 80), email, String(b.reason || '').slice(0, 300), visit]);
      } catch (err) {
        if (err.code === '23505' && err.constraint === 'appointments_slot_uq') {
          throw conflict('Sorry — that slot was just taken. Please pick another.');
        }
        throw err;
      }
      res.status(201).json({ code, email });
    });

    async function appointment(code, email) {
      const { rows } = await db.query(
        `SELECT a.*, to_char(a.starts_at AT TIME ZONE '${CLINIC_TZ}', 'FMDay, FMMonth FMDD · HH24:MI') AS local_label,
                d.full_name AS doctor_name, d.slug AS doctor_slug, d.photo, d.clinic, s.name AS specialty_name
           FROM appointments a JOIN doctors d ON d.id = a.doctor_id JOIN specialties s ON s.id = d.specialty_id
          WHERE a.code = $1`, [String(code).toUpperCase()]);
      if (!rows.length || rows[0].email !== String(email || '').trim().toLowerCase()) {
        throw notFound('No appointment matches that code and email');
      }
      return { ...rows[0], timezone: CLINIC_TZ };
    }

    api.get('/appointments/:code', async (req, res) => {
      res.json(await appointment(req.params.code, req.query.email));
    });

    api.post('/appointments/:code/cancel', async (req, res) => {
      const a = await appointment(req.params.code, req.body?.email);
      if (a.status === 'cancelled') throw conflict('This appointment is already cancelled');
      await db.query("UPDATE appointments SET status = 'cancelled' WHERE id = $1", [a.id]);
      res.json({ ...a, status: 'cancelled' });
    });
  },
});
