// FitTrack API - workout log, weekly progress and personal records.
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { start, badRequest, notFound } from '../kit/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const ATHLETE = 'sam-rivera'; // demo athlete - no login in this lab
const TYPES = ['run', 'ride', 'intervals', 'trail', 'sprint', 'hills', 'strength', 'yoga'];
// Rough MET values, used to estimate calories for logged workouts.
const MET = { run: 9.8, ride: 7.5, intervals: 11, trail: 9, sprint: 12, hills: 10, strength: 6, yoga: 3 };

const shape = (w) => ({
  ...w,
  distance_km: w.distance_m == null ? null : Math.round(w.distance_m / 10) / 100,
  pace_s_per_km: w.distance_m ? Math.round(w.duration_s / (w.distance_m / 1000)) : null,
});

await start({
  name: 'fittrack',
  migrationsDir: path.join(here, '../db/migrations'),
  seedFile: path.join(here, '../db/seed.sql'),

  routes(api, { db }) {
    async function athlete() {
      const { rows } = await db.query('SELECT * FROM athletes WHERE slug = $1', [ATHLETE]);
      if (!rows.length) throw notFound('Athlete not found');
      return { ...rows[0], weight_kg: Number(rows[0].weight_kg) };
    }

    api.get('/athlete', async (_req, res) => {
      const a = await athlete();
      const week = await db.query(
        `SELECT coalesce(sum(distance_m), 0)::int AS metres, coalesce(sum(duration_s), 0)::int AS seconds,
                count(*)::int AS sessions, coalesce(sum(calories), 0)::int AS calories
           FROM workouts WHERE athlete_id = $1 AND started_at >= date_trunc('week', now())`, [a.id]);
      // Streak: consecutive days (ending today or yesterday) with a workout.
      const streak = await db.query(
        `WITH days AS (SELECT DISTINCT (started_at AT TIME ZONE 'UTC')::date AS d FROM workouts WHERE athlete_id = $1),
              ordered AS (SELECT d, d - (row_number() OVER (ORDER BY d))::int AS grp FROM days)
         SELECT count(*)::int AS days FROM ordered
          WHERE grp = (SELECT grp FROM ordered ORDER BY d DESC LIMIT 1)
            AND (SELECT max(d) FROM days) >= current_date - 1`, [a.id]);
      const prs = await db.query(
        `SELECT
           (SELECT row_to_json(x) FROM (SELECT id, title, distance_m, duration_s, started_at FROM workouts
              WHERE athlete_id = $1 AND type IN ('run','trail') ORDER BY distance_m DESC NULLS LAST LIMIT 1) x) AS longest_run,
           (SELECT row_to_json(x) FROM (SELECT id, title, distance_m, duration_s, started_at FROM workouts
              WHERE athlete_id = $1 AND distance_m >= 5000 AND type IN ('run','sprint','intervals')
              ORDER BY duration_s::float / distance_m LIMIT 1) x) AS fastest_pace,
           (SELECT row_to_json(x) FROM (SELECT id, title, elevation_m, started_at FROM workouts
              WHERE athlete_id = $1 ORDER BY elevation_m DESC LIMIT 1) x) AS most_climbing,
           (SELECT count(*)::int FROM workouts WHERE athlete_id = $1) AS total_workouts`, [a.id]);
      res.json({ ...a, this_week: week.rows[0], streak_days: streak.rows[0]?.days || 0, records: prs.rows[0] });
    });

    api.get('/progress', async (req, res) => {
      const weeks = Math.min(Math.max(Number(req.query.weeks) || 10, 4), 26);
      const a = await athlete();
      const { rows } = await db.query(
        `WITH w AS (SELECT generate_series(date_trunc('week', now()) - ($2::int - 1) * interval '1 week', date_trunc('week', now()), interval '1 week') AS week_start)
         SELECT to_char(w.week_start, 'YYYY-MM-DD') AS week_start,
                coalesce(round(sum(x.distance_m) / 1000.0, 1), 0)::float AS km,
                coalesce(sum(x.duration_s) / 60, 0)::int AS minutes,
                count(x.id)::int AS sessions,
                coalesce(sum(x.calories), 0)::int AS calories
           FROM w LEFT JOIN workouts x ON x.athlete_id = $1 AND x.started_at >= w.week_start AND x.started_at < w.week_start + interval '1 week'
          GROUP BY w.week_start ORDER BY w.week_start`, [a.id, weeks]);
      const types = await db.query(
        `SELECT type, count(*)::int AS sessions, (sum(duration_s) / 60)::int AS minutes
           FROM workouts WHERE athlete_id = $1 AND started_at >= now() - make_interval(weeks => $2)
          GROUP BY type ORDER BY minutes DESC`, [a.id, weeks]);
      res.json({ weeks: rows, by_type: types.rows, goals: { km: a.weekly_km_goal, minutes: a.weekly_minutes_goal } });
    });

    api.get('/workouts', async (req, res) => {
      const a = await athlete();
      const params = [a.id];
      let where = 'athlete_id = $1';
      if (req.query.type && TYPES.includes(req.query.type)) { params.push(req.query.type); where += ` AND type = $${params.length}`; }
      params.push(Math.min(Number(req.query.limit) || 30, 100), Math.max(Number(req.query.offset) || 0, 0));
      const { rows } = await db.query(
        `SELECT * FROM workouts WHERE ${where} ORDER BY started_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
      res.json(rows.map(shape));
    });

    api.get('/workouts/:id', async (req, res) => {
      const a = await athlete();
      const { rows } = await db.query('SELECT * FROM workouts WHERE id = $1 AND athlete_id = $2', [Number(req.params.id) || 0, a.id]);
      if (!rows.length) throw notFound('Workout not found');
      res.json(shape(rows[0]));
    });

    api.post('/workouts', async (req, res) => {
      const b = req.body || {};
      if (!TYPES.includes(b.type)) throw badRequest(`type must be one of ${TYPES.join(', ')}`);
      const minutes = Number(b.duration_min);
      if (!(minutes > 0 && minutes <= 1440)) throw badRequest('Duration must be between 1 and 1440 minutes');
      const km = b.distance_km === '' || b.distance_km == null ? null : Number(b.distance_km);
      if (km != null && !(km >= 0 && km <= 500)) throw badRequest('Distance must be between 0 and 500 km');
      const hr = b.avg_hr ? Number(b.avg_hr) : null;
      if (hr != null && !(hr >= 40 && hr <= 220)) throw badRequest('Average heart rate must be between 40 and 220');
      const effort = Math.min(10, Math.max(1, Number(b.effort) || 5));
      const startedAt = b.started_at ? new Date(b.started_at) : new Date();
      if (Number.isNaN(startedAt.getTime()) || startedAt > new Date(Date.now() + 60_000)) throw badRequest('Start time can’t be in the future');
      const a = await athlete();
      const calories = Math.round(MET[b.type] * a.weight_kg * (minutes / 60));
      const title = String(b.title || '').trim() || `${b.type[0].toUpperCase()}${b.type.slice(1)} session`;
      const { rows } = await db.query(
        `INSERT INTO workouts (ext_ref, athlete_id, type, title, started_at, duration_s, distance_m, elevation_m, avg_hr, effort, calories, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [`user-${crypto.randomUUID()}`, a.id, b.type, title.slice(0, 80), startedAt.toISOString(), Math.round(minutes * 60),
          km == null ? null : Math.round(km * 1000), Math.max(0, Number(b.elevation_m) || 0), hr, effort, calories,
          String(b.notes || '').slice(0, 500)]);
      res.status(201).json(shape(rows[0]));
    });

    api.delete('/workouts/:id', async (req, res) => {
      const a = await athlete();
      const r = await db.query('DELETE FROM workouts WHERE id = $1 AND athlete_id = $2 RETURNING id', [Number(req.params.id) || 0, a.id]);
      if (!r.rowCount) throw notFound('Workout not found');
      res.json({ deleted: r.rows[0].id });
    });
  },
});
