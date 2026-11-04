// HireHub API - job board with resume uploads to shared EFS storage.
//
// Resumes are written to the EFS volume at UPLOAD_DIR/resumes by whichever
// API replica receives the application; the hiring-team view can download
// them through any replica.
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { start, badRequest, notFound, conflict } from '../kit/index.js';
import { createUploader, removeUpload, seedFiles, uploadsRoot, uploadsWritable } from '../kit/uploads.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const SUBDIR = 'resumes';
const STATUSES = ['received', 'reviewing', 'interview', 'offer', 'declined'];
const SAFE = /^[a-z0-9][a-z0-9._-]{0,120}$/i;

const upload = createUploader({
  subdir: SUBDIR,
  maxBytes: 5 * 1024 * 1024,
  types: {
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  },
});

const JOB_SELECT = `SELECT j.*, c.slug AS company_slug, c.name AS company_name, c.image AS company_image, c.industry,
    (SELECT count(*)::int FROM applications a WHERE a.job_id = j.id) AS applicants
  FROM jobs j JOIN companies c ON c.id = j.company_id`;

await start({
  name: 'hirehub',
  migrationsDir: path.join(here, '../db/migrations'),
  seedFile: path.join(here, '../db/seed.sql'),
  onReady: () => seedFiles(path.join(here, '../db/resumes'), SUBDIR),
  readinessChecks: [uploadsWritable],

  routes(api, { db, log }) {
    api.get('/jobs', async (req, res) => {
      const where = ["j.status = 'open'"];
      const params = [];
      const add = (sql, v) => { params.push(v); where.push(sql.replaceAll('?', `$${params.length}`)); };
      if (req.query.q) add('(j.title ILIKE ? OR j.team ILIKE ? OR c.name ILIKE ?)', `%${String(req.query.q).slice(0, 60)}%`);
      if (req.query.workplace) add('j.workplace = ?', String(req.query.workplace));
      if (req.query.level) add('j.level = ?', String(req.query.level));
      if (req.query.company) add('c.slug = ?', String(req.query.company));
      const { rows } = await db.query(`${JOB_SELECT} WHERE ${where.join(' AND ')} ORDER BY j.posted_at DESC`, params);
      res.json(rows);
    });

    api.get('/jobs/:slug', async (req, res) => {
      const { rows } = await db.query(`${JOB_SELECT} WHERE j.slug = $1`, [req.params.slug]);
      if (!rows.length) throw notFound('Job not found');
      res.json(rows[0]);
    });

    api.get('/companies', async (_req, res) => {
      const { rows } = await db.query(
        `SELECT c.*, count(j.id) FILTER (WHERE j.status = 'open')::int AS open_jobs
           FROM companies c LEFT JOIN jobs j ON j.company_id = c.id GROUP BY c.id ORDER BY open_jobs DESC, c.name`);
      res.json(rows);
    });

    api.get('/companies/:slug', async (req, res) => {
      const c = await db.query('SELECT * FROM companies WHERE slug = $1', [req.params.slug]);
      if (!c.rowCount) throw notFound('Company not found');
      const jobs = await db.query(`${JOB_SELECT} WHERE c.slug = $1 AND j.status = 'open' ORDER BY j.posted_at DESC`, [req.params.slug]);
      res.json({ ...c.rows[0], jobs: jobs.rows });
    });

    // Apply: multipart form with a "resume" file (PDF/DOC/DOCX, max 5 MB).
    api.post('/jobs/:slug/apply', upload.single('resume'), async (req, res) => {
      const file = req.file;
      try {
        const b = req.body || {};
        const name = String(b.full_name || '').trim();
        const email = String(b.email || '').trim().toLowerCase();
        if (!file) throw badRequest('Please attach your resume (PDF, DOC or DOCX)');
        if (!name) throw badRequest('Please enter your name');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest('Please enter a valid email');
        const job = await db.query("SELECT id, title FROM jobs WHERE slug = $1 AND status = 'open'", [req.params.slug]);
        if (!job.rowCount) throw notFound('This job is no longer open');
        const code = `HH-${crypto.randomInt(10000, 99999)}`;
        try {
          await db.query(
            `INSERT INTO applications (code, job_id, full_name, email, portfolio_url, cover_note, resume_file, resume_name, resume_bytes, received_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [code, job.rows[0].id, name.slice(0, 80), email, String(b.portfolio_url || '').slice(0, 200),
              String(b.cover_note || '').slice(0, 2000), file.filename, file.originalname.slice(0, 120), file.size, os.hostname()]);
        } catch (err) {
          if (err.code === '23505' && err.constraint === 'applications_job_email_uq') {
            throw conflict('You have already applied for this role with that email');
          }
          throw err;
        }
        log('info', 'application received', { job: req.params.slug, bytes: file.size, pod: os.hostname() });
        res.status(201).json({ code, email, received_by: os.hostname() });
      } catch (err) {
        if (file) await removeUpload(SUBDIR, file.filename);
        throw err;
      }
    });

    api.get('/applications/:code', async (req, res) => {
      const { rows } = await db.query(
        `SELECT a.code, a.full_name, a.email, a.status, a.resume_name, a.created_at, a.updated_at, a.received_by,
                j.title, j.slug AS job_slug, c.name AS company_name, c.image AS company_image
           FROM applications a JOIN jobs j ON j.id = a.job_id JOIN companies c ON c.id = j.company_id
          WHERE a.code = $1`, [String(req.params.code).toUpperCase()]);
      if (!rows.length || rows[0].email !== String(req.query.email || '').trim().toLowerCase()) {
        throw notFound('No application matches that code and email');
      }
      res.json({ ...rows[0], stages: STATUSES.filter((s) => s !== 'declined') });
    });

    // --- Hiring team view (demo: no login in this lab) ---------------------
    api.get('/hiring/jobs/:slug/applications', async (req, res) => {
      const job = await db.query(`${JOB_SELECT} WHERE j.slug = $1`, [req.params.slug]);
      if (!job.rowCount) throw notFound('Job not found');
      const { rows } = await db.query(
        `SELECT code, full_name, email, portfolio_url, cover_note, resume_name, resume_bytes, resume_file, status, received_by, created_at
           FROM applications WHERE job_id = $1 ORDER BY created_at DESC`, [job.rows[0].id]);
      res.json({ job: job.rows[0], applications: rows.map((a) => ({ ...a, resume_url: `/api/hiring/resumes/${a.resume_file}` })) });
    });

    api.patch('/hiring/applications/:code', async (req, res) => {
      const status = String(req.body?.status || '');
      if (!STATUSES.includes(status)) throw badRequest(`status must be one of ${STATUSES.join(', ')}`);
      const r = await db.query('UPDATE applications SET status = $1, updated_at = now() WHERE code = $2 RETURNING code, status',
        [status, String(req.params.code).toUpperCase()]);
      if (!r.rowCount) throw notFound('Application not found');
      res.json(r.rows[0]);
    });

    api.get('/hiring/resumes/:file', async (req, res, next) => {
      const { file } = req.params;
      if (!SAFE.test(file)) return next(notFound('File not found'));
      const a = await db.query('SELECT resume_name FROM applications WHERE resume_file = $1', [file]);
      if (!a.rowCount) return next(notFound('File not found'));
      res.download(path.join(uploadsRoot(), SUBDIR, file), a.rows[0].resume_name, { dotfiles: 'deny' }, (err) => {
        if (err && !res.headersSent) next(notFound('Resume file is missing from shared storage'));
      });
    });
  },
});
