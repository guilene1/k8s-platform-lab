#!/bin/sh
# Creates one database and one least-privilege login role per lab app on the
# shared RDS instance. Idempotent: safe to run any number of times.
#
# Environment (from the db-bootstrap Secret, synced by External Secrets):
#   PGHOST PGPORT PGUSER PGPASSWORD   master credential (PGDATABASE=postgres)
#   APPS                              space-separated app names
#   <app>_username / <app>_password   each app's credential
#
# For each app it guarantees:
#   - role <app>_app: LOGIN, no superuser/createdb/createrole, password kept
#     in sync with Secrets Manager
#   - database <app>, OWNED by that role (so the app can run its migrations)
#   - nobody else (PUBLIC) may connect to that database
set -eu

: "${PGHOST:?}" "${PGUSER:?}" "${PGPASSWORD:?}" "${APPS:?}"
export PGDATABASE="${PGDATABASE:-postgres}"
export PGCONNECT_TIMEOUT=10

echo "waiting for PostgreSQL at ${PGHOST}:${PGPORT:-5432}"
i=0
until psql -qtAc 'SELECT 1' >/dev/null 2>&1; do
  i=$((i + 1))
  [ "$i" -ge 60 ] && { echo "database not reachable after 10 minutes" >&2; psql -c 'SELECT 1'; exit 1; }
  sleep 10
done

for app in $APPS; do
  user="$(printenv "${app}_username" || true)"
  pass="$(printenv "${app}_password" || true)"
  if [ -z "$user" ] || [ -z "$pass" ]; then
    echo "missing credential for ${app} (expected ${app}_username / ${app}_password)" >&2
    exit 1
  fi

  echo "== ${app}: role ${user}, database ${app}"
  # psql variables (:'x' literal, :"x" identifier) keep values safely quoted.
  psql -v ON_ERROR_STOP=1 -q -v app="$app" -v user="$user" -v pass="$pass" <<'SQL'
-- Re-runs are expected; skip "already exists/granted" notices.
SET client_min_messages = warning;

SELECT format('CREATE ROLE %I LOGIN', :'user')
 WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'user') \gexec

-- New roles are already NOSUPERUSER/NOREPLICATION (and the RDS master, not
-- being a true superuser, may not even mention those attributes).
ALTER ROLE :"user" WITH LOGIN NOCREATEDB NOCREATEROLE CONNECTION LIMIT 60 PASSWORD :'pass';

-- PostgreSQL 16+: to create a database OWNED BY another role, the creator
-- must be allowed to SET ROLE to it. Grant just that (no privilege inheritance).
GRANT :"user" TO CURRENT_USER WITH INHERIT FALSE, SET TRUE;

SELECT format('CREATE DATABASE %I OWNER %I', :'app', :'user')
 WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'app') \gexec

ALTER DATABASE :"app" OWNER TO :"user";

-- Only the owner can change the database's privileges, so act as it.
SET ROLE :"user";
REVOKE ALL ON DATABASE :"app" FROM PUBLIC;
GRANT CONNECT, TEMPORARY ON DATABASE :"app" TO :"user";
RESET ROLE;
SQL
done

echo "all app databases are ready"
