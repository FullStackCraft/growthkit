#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
container="growthkit-sql-test-$$"
trap 'docker stop "$container" >/dev/null 2>&1 || true' EXIT
docker run --rm --detach --name "$container" -e POSTGRES_PASSWORD=growthkit-local-test postgres:15-alpine >/dev/null
for attempt in {1..30}; do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
psql_test() { docker exec -i "$container" psql -X -q -v ON_ERROR_STOP=1 -U postgres "$@"; }
psql_test <<'SQL'
create role anon;
create role authenticated;
create role service_role bypassrls;
create database fresh;
create database upgrade;
SQL
# Fresh installation with no legacy dependency; repeatability.
psql_test -d fresh < sql/0.0.6_events.sql
psql_test -d fresh < sql/0.0.6_events.sql
# Upgrade a database with historical referral rows, without changing that schema.
psql_test -d upgrade < sql/growthkit_referral_events.sql
psql_test -d upgrade <<'SQL'
insert into public.growthkit_referral_events(event_id,occurred_at,product_name,source,source_type,page_url,page_path)
values('legacy-keep',now(),'test','direct','direct','https://example.com/','/');
SQL
psql_test -d upgrade < sql/0.0.6_events.sql
psql_test -d upgrade < test/sql-assertions.sql
psql_test -d upgrade < sql/0.0.6_events.sql
psql_test -d upgrade < test/sql-assertions.sql
psql_test -d upgrade < test/report-fixtures.sql
run_report() {
  { cat <<'SQL'
set growthkit.product='test';
set growthkit.start_at='2026-10-01T00:00:00Z';
set growthkit.end_at='2026-12-01T00:00:00Z';
SQL
    cat "$1";
  } | psql_test -At -F '|' -d upgrade
}
acquisition="$(run_report sql/reports/acquisition.sql)"
[ "$acquisition" = 'google.com|1|1|1|1|100.00' ] || { printf 'Incorrect acquisition: %s\n' "$acquisition"; exit 1; }
revenue="$(run_report sql/reports/recurring-revenue.sql)"
[ "$revenue" = 'google.com|usd|1|2900|0|0' ] || { printf 'Incorrect revenue: %s\n' "$revenue"; exit 1; }
conversion="$(run_report sql/reports/conversion-attribution.sql)"
[[ "$conversion" == *'user_1|2026-11-01 00:01:00+00|google.com|google.com|t|usd'* ]] || { printf 'Incorrect attribution: %s\n' "$conversion"; exit 1; }
[[ "$conversion" == *'user_unknown|2026-11-01 00:03:00+00|unknown|unknown|f|usd'* ]] || { printf 'Unknown coverage missing: %s\n' "$conversion"; exit 1; }
printf 'SQL installation, upgrade, deduplication, identity, RLS and report checks passed.\n'
