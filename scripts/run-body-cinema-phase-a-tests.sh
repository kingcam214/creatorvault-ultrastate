#!/usr/bin/env bash
set -euo pipefail
umask 077
[ "$#" -eq 0 ] || { printf '%s\n' 'PHASE_A_TEST_ARGUMENTS_REJECTED' >&2; exit 1; }
repo="$(git rev-parse --show-toplevel)"
cd "$repo"
for command in node pnpm; do
  command -v "$command" >/dev/null || { printf '%s\n' 'PHASE_A_NATIVE_TEST_TOOL_UNAVAILABLE' >&2; exit 1; }
done
fixture="/tmp/creatorvault-cv-video-026-phase-a-$(node -e 'process.stdout.write(require("node:crypto").randomBytes(12).toString("hex"))')"
[ ! -e "$fixture" ]
mkdir -m 700 "$fixture"
mkdir -m 700 "$fixture/datadir" "$fixture/tmp" "$fixture/uploads" "$fixture/.body-cinema-candidates"
socket="$fixture/mysql.sock"
daemon_pid=''
tool_fixture=''
db_environment=()
basedir=()
cleanup() {
  status=$?
  trap - EXIT INT TERM
  if [ -n "$daemon_pid" ] && kill -0 "$daemon_pid" 2>/dev/null; then
    kill -TERM "$daemon_pid" 2>/dev/null || :
    for unused in $(seq 1 40); do
      kill -0 "$daemon_pid" 2>/dev/null || break
      sleep 0.1
    done
    if kill -0 "$daemon_pid" 2>/dev/null; then
      printf '%s\n' 'PHASE_A_PRIVATE_FIXTURE_CLEANUP_INCOMPLETE' >&2
      exit 1
    fi
  fi
  wait "$daemon_pid" 2>/dev/null || :
  case "$fixture" in /tmp/creatorvault-cv-video-026-phase-a-*) rm -rf -- "$fixture" ;; *) exit 1 ;; esac
  if [ -n "$tool_fixture" ]; then
    case "$tool_fixture" in /tmp/creatorvault-regressions.*) rm -rf -- "$tool_fixture" ;; *) exit 1 ;; esac
  fi
  printf '%s\n' 'Phase A private socket-only database and storage fixture removed.'
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT TERM
if ! command -v mariadb-install-db >/dev/null || ! command -v mariadbd >/dev/null || ! command -v mariadb >/dev/null; then
  tool_fixture="$(mktemp -d /tmp/creatorvault-regressions.XXXXXXXX)"
  mkdir -m 700 "$tool_fixture/portable-db-tools"
  pnpm exec tsx scripts/portableMariaDbTools.ts --prepare "$tool_fixture/portable-db-tools" > "$tool_fixture/tools.private.json"
  mapfile -t paths < <(node --input-type=module -e 'import fs from "node:fs";const v=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));for(const k of ["installer","server","client","libraryPath","basedir"]){if(typeof v[k]!=="string"||/[\r\n\0]/.test(v[k]))throw new Error("INVALID_PRIVATE_TOOL_METADATA");console.log(v[k]);}' "$tool_fixture/tools.private.json")
  [ "${#paths[@]}" -eq 5 ] || { printf '%s\n' 'PRIVATE_DB_TOOLS_METADATA_INVALID' >&2; exit 1; }
  installer="${paths[0]}"; daemon="${paths[1]}"; client="${paths[2]}"
  db_environment=(env "LD_LIBRARY_PATH=${paths[3]}")
  basedir=("--basedir=${paths[4]}")
else
  installer="$(command -v mariadb-install-db)"; daemon="$(command -v mariadbd)"; client="$(command -v mariadb)"
fi
"${db_environment[@]}" "$installer" --no-defaults "${basedir[@]}" --datadir="$fixture/datadir" --auth-root-authentication-method=normal --skip-test-db --user="$(id -un)" >"$fixture/install.log" 2>&1
"${db_environment[@]}" "$daemon" --no-defaults "${basedir[@]}" --user="$(id -un)" --datadir="$fixture/datadir" --socket="$socket" --pid-file="$fixture/daemon.pid" --skip-networking --skip-log-bin --max-connections=12 --innodb-buffer-pool-size=64M --tmpdir="$fixture/tmp" --log-error="$fixture/daemon.log" >"$fixture/daemon.stdout" 2>&1 &
daemon_pid=$!
ready=0
for unused in $(seq 1 100); do
  kill -0 "$daemon_pid" 2>/dev/null || { printf '%s\n' 'PHASE_A_PRIVATE_DATABASE_START_FAILED' >&2; exit 1; }
  if [ -S "$socket" ] && "${db_environment[@]}" "$client" --no-defaults --protocol=socket --socket="$socket" --user=root -N -e 'SELECT 1' >/dev/null 2>&1; then ready=1; break; fi
  sleep 0.1
done
[ "$ready" -eq 1 ] || { printf '%s\n' 'PHASE_A_PRIVATE_DATABASE_NOT_READY' >&2; exit 1; }
password="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(24).toString("hex"))')"
printf 'CREATE DATABASE creatorvault_body_cinema_test; CREATE USER cv_phase_a@localhost IDENTIFIED BY "%s"; GRANT ALL PRIVILEGES ON creatorvault_body_cinema_test.* TO cv_phase_a@localhost;\n' "$password" | "${db_environment[@]}" "$client" --no-defaults --protocol=socket --socket="$socket" --user=root
jwt_secret="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("hex"))')"
url="$(PASSWORD="$password" SOCKET="$socket" node -e 'const u=new URL("mysql://cv_phase_a@localhost/creatorvault_body_cinema_test");u.password=process.env.PASSWORD;u.searchParams.set("socketPath",process.env.SOCKET);process.stdout.write(u.toString())')"
printf '%s\n' 'Running Phase A regressions on a private socket-only synthetic fixture; no render/provider/publication credentials are passed.'
env -i PATH="$PATH" HOME="$HOME" USER="$(id -un)" \
  NODE_ENV=test NODE_OPTIONS=--max-old-space-size=1536 \
  CREATORVAULT_LOCAL_PROOF_MODE=1 \
  JWT_SECRET="$jwt_secret" VITE_APP_ID=cv_phase_a OAUTH_SERVER_URL=http://127.0.0.1:9 \
  DATABASE_URL="$url" \
  CREATORVAULT_BODY_CINEMA_TEST_DATABASE_URL="$url" \
  CREATORVAULT_BODY_CINEMA_TEST_STORAGE_ROOT="$fixture" \
  CREATORVAULT_BODY_CINEMA_PHASE_A_TEST_ROOT="$fixture" \
  CREATORVAULT_BODY_CINEMA_PHASE_A_DATABASE_URL="$url" \
  CREATORVAULT_LOCAL_PROOF_UPLOAD_ROOT="$fixture/uploads" \
  pnpm exec vitest run --config vitest.body-cinema-lifecycle.config.ts
