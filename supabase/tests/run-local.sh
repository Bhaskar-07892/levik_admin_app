#!/usr/bin/env bash
# Applies all migrations + seed to a throwaway local Postgres 17 and runs the SQL test suite.
# No Docker needed. Usage: npm run db:test   (set PG_BIN to override the Postgres binaries path)
set -euo pipefail
# Postgres refuses to start on macOS without a valid locale in the environment.
export LC_ALL="${LC_ALL:-en_US.UTF-8}" LANG="${LANG:-en_US.UTF-8}"

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
if [[ -z "${PG_BIN:-}" ]]; then
  for candidate in /opt/homebrew/opt/postgresql@17/bin /usr/local/opt/postgresql@17/bin /usr/lib/postgresql/17/bin; do
    [[ -x "$candidate/postgres" ]] && PG_BIN="$candidate" && break
  done
  PG_BIN="${PG_BIN:-$(pg_config --bindir)}"
fi
PORT="${PG_TEST_PORT:-54399}"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/levik-db-test.XXXXXX")"

"$PG_BIN/postgres" --version | grep -q " 17\." || { echo "Postgres 17 required (found: $("$PG_BIN/postgres" --version))"; exit 1; }

cleanup() {
  "$PG_BIN/pg_ctl" -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

"$PG_BIN/initdb" -D "$WORK/data" -U postgres --auth=trust >/dev/null
"$PG_BIN/pg_ctl" -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/pg.log" -w start >/dev/null

PSQL=("$PG_BIN/psql" -h "$WORK" -p "$PORT" -U postgres -X -q -v ON_ERROR_STOP=1)
"${PSQL[@]}" -d postgres -c "create database levik" >/dev/null

run() {
  echo "→ $(basename "$1")"
  "${PSQL[@]}" -d levik -f "$1"
}

run "$ROOT/supabase/tests/supabase_stub.sql"
for migration in "$ROOT"/supabase/migrations/*.sql; do run "$migration"; done
run "$ROOT/supabase/seed.sql"
run "$ROOT/supabase/tests/rules.test.sql"
echo "All database tests passed."
