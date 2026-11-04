-- Idempotent seed: companies.slug, jobs.slug and applications.code are
-- UNIQUE; every INSERT uses ON CONFLICT DO NOTHING. Sample resume files are
-- copied onto the shared EFS volume at startup (seedFiles, idempotent).

INSERT INTO companies (slug, name, industry, location, size, tagline, about, image, perks) VALUES
  ('northwind-labs', 'Northwind Labs', 'Data & AI', 'Seattle, WA', '120 people', 'Forecasts that small businesses actually trust.',
   'Northwind builds demand-forecasting tools for independent retailers. Small teams, long-term thinking, and a lounge with too many plants.',
   '/images/companies/northwind-labs.jpg', ARRAY['4-day week in summer','Learning budget $2,500','Home office stipend']),
  ('brightside-health', 'Brightside Health', 'Healthcare', 'Boston, MA', '340 people', 'Primary care that fits around real lives.',
   'Brightside runs 30 neighbourhood clinics and the software behind them. We hire people who care about patients and about clean data.',
   '/images/companies/brightside-health.jpg', ARRAY['Full health cover','Parental leave 20 weeks','Volunteer days']),
  ('ledgerline', 'Ledgerline', 'Fintech', 'New York, NY', '85 people', 'Bookkeeping that closes itself.',
   'Ledgerline automates month-end close for 6,000 small companies. We ship weekly, write things down and keep meetings short.',
   '/images/companies/ledgerline.jpg', ARRAY['Equity for everyone','Remote-first','Annual offsite']),
  ('forge-robotics', 'Forge Robotics', 'Robotics', 'Pittsburgh, PA', '210 people', 'Robots for the warehouse floor.',
   'Forge designs autonomous carts that move pallets in busy warehouses. Our lab is a converted steel mill with a test track down the middle.',
   '/images/companies/forge-robotics.jpg', ARRAY['On-site lab','Relocation support','Commuter benefits']),
  ('studio-meridian', 'Studio Meridian', 'Design', 'Austin, TX', '40 people', 'Brands with a point of view.',
   'An independent design studio working with museums, festivals and a few brave startups. We like big type and small teams.',
   '/images/companies/studio-meridian.jpg', ARRAY['Studio library','Conference travel','Flexible hours']),
  ('parcel-and-pine', 'Parcel & Pine', 'E-commerce', 'Portland, OR', '60 people', 'Sustainable packaging, delivered.',
   'Parcel & Pine sells compostable shipping supplies to 20,000 online shops. Profitable, calm, and growing steadily.',
   '/images/companies/parcel-and-pine.jpg', ARRAY['Profit sharing','Dog-friendly office','Bike to work scheme']),
  ('atlas-civic', 'Atlas Civic', 'GovTech', 'Washington, DC', '150 people', 'Public services that work on a phone.',
   'Atlas builds digital services for city governments — permits, benefits, transit passes. Our work is used by 4 million residents.',
   '/images/companies/atlas-civic.jpg', ARRAY['Public-service loan help','Generous PTO','Hybrid schedule']),
  ('quietdesk', 'Quietdesk', 'Productivity', 'Remote', '25 people', 'Fewer notifications, better work.',
   'Quietdesk makes a focus-first workspace app for remote teams. A tiny, fully remote company that practises what it preaches.',
   '/images/companies/quietdesk.jpg', ARRAY['Fully remote','No-meeting Wednesdays','Hardware budget'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO jobs (slug, company_id, title, team, level, workplace, employment, location, salary_min, salary_max,
                  summary, responsibilities, requirements, posted_at)
SELECT j.slug, c.id, j.title, j.team, j.level, j.workplace, j.employment, j.location, j.smin, j.smax, j.summary, j.resp, j.reqs,
       now() - j.age * interval '1 day'
FROM (VALUES
  ('platform-engineer-northwind', 'northwind-labs', 'Senior Platform Engineer', 'Infrastructure', 'senior', 'hybrid', 'full-time', 'Seattle, WA', 165000, 205000,
   'Own the Kubernetes platform our 30 engineers deploy to every day.',
   ARRAY['Run and evolve our EKS clusters with Terraform and Argo CD','Build paved paths for services: CI, observability, secrets','Lead incident reviews and make on-call boring'],
   ARRAY['5+ years running production infrastructure','Deep Kubernetes and AWS experience','Comfort with Go or Python'], 2),
  ('data-analyst-northwind', 'northwind-labs', 'Data Analyst', 'Insights', 'mid', 'remote', 'full-time', 'Remote (US)', 105000, 130000,
   'Turn millions of sales records into stories our customers act on.',
   ARRAY['Build dashboards and self-serve datasets','Partner with product on experiments','Explain forecasts to non-technical customers'],
   ARRAY['Strong SQL','Experience with dbt or similar','Clear written communication'], 6),
  ('clinic-ops-engineer', 'brightside-health', 'Site Reliability Engineer', 'Clinical Systems', 'mid', 'hybrid', 'full-time', 'Boston, MA', 140000, 175000,
   'Keep the systems clinicians rely on fast, safe and always on.',
   ARRAY['Improve availability of scheduling and records services','Automate PostgreSQL operations','Shape our HIPAA-aware observability stack'],
   ARRAY['3+ years in SRE or DevOps','PostgreSQL in production','Calm under pressure'], 4),
  ('product-designer-brightside', 'brightside-health', 'Product Designer', 'Patient Apps', 'senior', 'remote', 'full-time', 'Remote (US)', 135000, 165000,
   'Design the app 400,000 patients use to book, message and pay.',
   ARRAY['Lead design for booking and messaging flows','Run research with patients and clinicians','Contribute to our design system'],
   ARRAY['Portfolio of shipped product work','Accessibility know-how','Healthcare experience a plus'], 9),
  ('backend-engineer-ledgerline', 'ledgerline', 'Backend Engineer (Node.js)', 'Core Ledger', 'mid', 'remote', 'full-time', 'Remote (US/Canada)', 140000, 170000,
   'Build the double-entry engine that closes books for 6,000 companies.',
   ARRAY['Design APIs for transactions and reconciliations','Make month-end jobs idempotent and observable','Review code and mentor'],
   ARRAY['Node.js or TypeScript in production','Relational data modelling','Care for correctness'], 1),
  ('controls-engineer-forge', 'forge-robotics', 'Controls Engineer', 'Autonomy', 'senior', 'onsite', 'full-time', 'Pittsburgh, PA', 150000, 190000,
   'Make 2-tonne carts stop exactly where they should, every time.',
   ARRAY['Tune motion control for new cart platforms','Test on our in-house track','Work with perception on safety cases'],
   ARRAY['Control theory background','C++ on embedded targets','Hands-on hardware experience'], 12),
  ('junior-designer-meridian', 'studio-meridian', 'Junior Graphic Designer', 'Studio', 'junior', 'onsite', 'full-time', 'Austin, TX', 58000, 70000,
   'Join a small studio and work on festival and museum identities.',
   ARRAY['Produce layouts, posters and social assets','Prepare files for print','Present work to clients alongside leads'],
   ARRAY['A portfolio that shows typographic care','Figma and Adobe CC','Curiosity'], 3),
  ('ops-lead-parcel', 'parcel-and-pine', 'Operations Lead', 'Fulfilment', 'lead', 'onsite', 'full-time', 'Portland, OR', 95000, 115000,
   'Run our warehouse and the team that ships 3,000 orders a day.',
   ARRAY['Lead a team of 14 across two shifts','Improve pick rates and accuracy','Own carrier relationships'],
   ARRAY['Warehouse or logistics leadership','Data-driven mindset','Forklift certification a plus'], 7),
  ('frontend-engineer-atlas', 'atlas-civic', 'Frontend Engineer', 'Resident Services', 'mid', 'hybrid', 'full-time', 'Washington, DC', 125000, 150000,
   'Build accessible public services used by millions of residents.',
   ARRAY['Ship React interfaces that meet WCAG 2.2 AA','Work with researchers on real resident feedback','Improve performance on low-end phones'],
   ARRAY['React and modern CSS','Accessibility expertise','Interest in public service'], 5),
  ('devops-contractor-quietdesk', 'quietdesk', 'DevOps Engineer (Contract)', 'Engineering', 'senior', 'remote', 'contract', 'Remote (Worldwide)', 90000, 120000,
   'A six-month contract to move us from VMs to Kubernetes.',
   ARRAY['Containerise five services','Stand up EKS with GitOps','Hand over with docs and runbooks'],
   ARRAY['Production Kubernetes migrations','Terraform','Excellent async communication'], 0)
) AS j(slug, company, title, team, level, workplace, employment, location, smin, smax, summary, resp, reqs, age)
JOIN companies c ON c.slug = j.company
ON CONFLICT (slug) DO NOTHING;

-- Sample applications (check status of HH-2041 with amara.nwosu@example.com).
INSERT INTO applications (code, job_id, full_name, email, portfolio_url, cover_note, resume_file, resume_name, resume_bytes, status, received_by, created_at)
SELECT a.code, j.id, a.name, a.email, a.url, a.note, a.file, a.file, a.bytes, a.status, 'seed', now() - a.age * interval '1 day'
FROM (VALUES
  ('HH-2041', 'platform-engineer-northwind', 'Amara Nwosu', 'amara.nwosu@example.com', 'https://github.com/example', 'I run 40 EKS clusters today and would love to build a platform from the ground up.', 'sample-amara-nwosu.pdf', 1156, 'interview', 2),
  ('HH-2042', 'product-designer-brightside', 'Leo Martin', 'leo.martin@example.com', 'https://dribbble.com/example', 'Healthcare UX is where I want to spend the next five years.', 'sample-leo-martin.pdf', 1080, 'reviewing', 1),
  ('HH-2043', 'data-analyst-northwind', 'Sofia Lindqvist', 'sofia.lindqvist@example.com', '', 'Forecast explanations are my favourite kind of data storytelling.', 'sample-sofia-lindqvist.pdf', 1070, 'received', 0)
) AS a(code, job, name, email, url, note, file, bytes, status, age)
JOIN jobs j ON j.slug = a.job
ON CONFLICT (code) DO NOTHING;
