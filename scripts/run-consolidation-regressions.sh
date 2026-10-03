#!/usr/bin/env bash
set -euo pipefail
umask 077
[ "$#" -eq 0 ] || { printf 'REGRESSION_ARGUMENTS_FORBIDDEN\n' >&2; exit 1; }
root="$(git rev-parse --show-toplevel)"
cd -- "$root"
unset DATABASE_URL JWT_SECRET OPENAI_API_KEY OPENAI_API_BASE STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET POLLO_API_KEY REPLICATE_API_TOKEN RUNWAY_API_KEY TELEGRAM_BOT_TOKEN TOPAZ_API_KEY DIGITALOCEAN_ACCESS_TOKEN
export NODE_ENV=test TZ=UTC
fixture=""
db_pid=""
cleanup() {
  if [ -n "$db_pid" ] && kill -0 "$db_pid" 2>/dev/null; then
    kill -TERM "$db_pid"
    wait "$db_pid" 2>/dev/null || :
  fi
  if [ -n "$fixture" ]; then
    case "$fixture" in "${TMPDIR:-/tmp}"/creatorvault-regressions.*) rm -rf -- "$fixture" ;; *) printf 'UNSAFE_FIXTURE_CLEANUP\n' >&2; exit 1 ;; esac
  fi
}
trap cleanup EXIT
if [ -n "${CREATORVAULT_PAYOUT_TEST_DATABASE_URL:-}" ] || [ -n "${CREATORVAULT_PERSONA_TEST_DATABASE_URL:-}" ] || [ -n "${CREATORVAULT_MIGRATION_TEST_DATABASE_URL:-}" ]; then
  node --input-type=module <<'JS'
const pairs=[['CREATORVAULT_PAYOUT_TEST_DATABASE_URL','creatorvault_payout_test'],['CREATORVAULT_PERSONA_TEST_DATABASE_URL','creatorvault_persona_test'],['CREATORVAULT_MIGRATION_TEST_DATABASE_URL','creatorvault_consolidation_migration_test']];
for(const [variable,name] of pairs){let url;try{url=new URL(process.env[variable]);}catch{throw new Error('ISOLATED_TEST_DATABASE_INPUT_REQUIRED');}if(!['127.0.0.1','localhost'].includes(url.hostname)||url.pathname!=='/'+name)throw new Error('NONLOCAL_OR_WRONG_TEST_DATABASE_FORBIDDEN');}
JS
else
  fixture="$(mktemp -d "${TMPDIR:-/tmp}/creatorvault-regressions.XXXXXXXX")"
  mkdir "$fixture/data"
  db_environment=()
  basedir=()
  if [ "${CREATORVAULT_TEST_FORCE_PORTABLE_DB_TOOLS:-0}" = 1 ] || ! command -v mariadb-install-db >/dev/null || ! command -v mariadbd >/dev/null || ! command -v mariadb >/dev/null; then
    mkdir "$fixture/portable-db-tools"
    pnpm exec tsx scripts/portableMariaDbTools.ts --prepare "$fixture/portable-db-tools" > "$fixture/tools.private.json"
    mapfile -t paths < <(node --input-type=module -e 'import fs from "node:fs";const v=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));for(const k of ["installer","server","client","libraryPath","basedir"]){if(typeof v[k]!=="string"||/[\r\n\0]/.test(v[k]))throw new Error("INVALID_PRIVATE_TOOL_METADATA");console.log(v[k]);}' "$fixture/tools.private.json")
    [ "${#paths[@]}" -eq 5 ] || { printf 'PRIVATE_DB_TOOLS_METADATA_INVALID\n' >&2; exit 1; }
    installer="${paths[0]}"; server="${paths[1]}"; client="${paths[2]}"
    db_environment=(env "LD_LIBRARY_PATH=${paths[3]}")
    basedir=("--basedir=${paths[4]}")
    printf 'PRIVATE_EXTRACTED_DB_TOOLS=PASS SYSTEM_PACKAGES_UNCHANGED\n'
  else
    installer="$(command -v mariadb-install-db)"; server="$(command -v mariadbd)"; client="$(command -v mariadb)"
  fi
  "${db_environment[@]}" "$installer" --no-defaults "${basedir[@]}" --datadir="$fixture/data" --auth-root-authentication-method=normal --skip-test-db > "$fixture/install.private.log" 2>&1
  "${db_environment[@]}" "$server" --no-defaults "${basedir[@]}" --user="$(id -un)" --datadir="$fixture/data" --socket="$fixture/mysql.sock" --pid-file="$fixture/mysql.pid" --skip-networking --log-error="$fixture/server.private.log" > "$fixture/process.private.log" 2>&1 &
  db_pid=$!
  ready=0
  for attempt in $(seq 1 40); do
    if "${db_environment[@]}" "$client" --no-defaults --socket="$fixture/mysql.sock" -u root -N -e 'SELECT 1' > /dev/null 2>&1; then ready=1; break; fi
    kill -0 "$db_pid" 2>/dev/null || { printf 'ISOLATED_TEST_DATABASE_START_FAILED\n' >&2; exit 1; }
    sleep 1
  done
  [ "$ready" -eq 1 ] || { printf 'ISOLATED_TEST_DATABASE_READY_TIMEOUT\n' >&2; exit 1; }
  "${db_environment[@]}" "$client" --no-defaults --socket="$fixture/mysql.sock" -u root -e 'CREATE DATABASE creatorvault_payout_test; CREATE DATABASE creatorvault_persona_test; CREATE DATABASE creatorvault_consolidation_migration_test;'
  export CREATORVAULT_PAYOUT_TEST_DATABASE_URL="mysql://root@localhost/creatorvault_payout_test?socketPath=$fixture/mysql.sock"
  export CREATORVAULT_PERSONA_TEST_DATABASE_URL="mysql://root@localhost/creatorvault_persona_test?socketPath=$fixture/mysql.sock"
  export CREATORVAULT_MIGRATION_TEST_DATABASE_URL="mysql://root@localhost/creatorvault_consolidation_migration_test?socketPath=$fixture/mysql.sock"
fi
printf 'ISOLATED_DATABASE_BOUNDARY=PASS PROVIDER_CREDENTIALS=ABSENT\n'
pnpm test:stripe-payouts
pnpm test:persona-continuity
pnpm test:video-studio
pnpm test:consolidated-release
printf 'CONSOLIDATED_FEATURE_REGRESSIONS=PASS\n'
