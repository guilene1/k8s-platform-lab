-- HireHub schema: companies, job posts, applications with resume files on EFS.

CREATE TABLE companies (
  id        serial PRIMARY KEY,
  slug      text NOT NULL UNIQUE,
  name      text NOT NULL,
  industry  text NOT NULL,
  location  text NOT NULL,
  size      text NOT NULL,
  tagline   text NOT NULL,
  about     text NOT NULL,
  image     text NOT NULL,
  perks     text[] NOT NULL DEFAULT '{}'
);

CREATE TABLE jobs (
  id               serial PRIMARY KEY,
  slug             text NOT NULL UNIQUE,
  company_id       int  NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title            text NOT NULL,
  team             text NOT NULL,
  level            text NOT NULL CHECK (level IN ('junior', 'mid', 'senior', 'lead')),
  workplace        text NOT NULL CHECK (workplace IN ('remote', 'hybrid', 'onsite')),
  employment       text NOT NULL CHECK (employment IN ('full-time', 'part-time', 'contract')),
  location         text NOT NULL,
  salary_min       int  NOT NULL,
  salary_max       int  NOT NULL CHECK (salary_max >= salary_min),
  summary          text NOT NULL,
  responsibilities text[] NOT NULL,
  requirements     text[] NOT NULL,
  posted_at        timestamptz NOT NULL DEFAULT now(),
  status           text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed'))
);
CREATE INDEX jobs_company_idx ON jobs (company_id);

-- Resume files live on the shared EFS volume under <UPLOAD_DIR>/resumes.
CREATE TABLE applications (
  id            serial PRIMARY KEY,
  code          text NOT NULL UNIQUE,
  job_id        int  NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  full_name     text NOT NULL,
  email         text NOT NULL,
  portfolio_url text NOT NULL DEFAULT '',
  cover_note    text NOT NULL DEFAULT '',
  resume_file   text NOT NULL,
  resume_name   text NOT NULL,
  resume_bytes  int  NOT NULL,
  status        text NOT NULL DEFAULT 'received'
                CHECK (status IN ('received', 'reviewing', 'interview', 'offer', 'declined')),
  received_by   text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
-- One application per person per job.
CREATE UNIQUE INDEX applications_job_email_uq ON applications (job_id, email);
