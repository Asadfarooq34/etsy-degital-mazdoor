#!/usr/bin/env bash
# =============================================================================
# Digital Mazdoor API — server-side auth acceptance tests.
#
# What it does:
#   1. Starts the API on throwaway ports with a throwaway ADMIN_PASSWORD and a
#      temp SQLite dir (per-server), runs a curl-based scenario suite against
#      the session-cookie auth system in apps/api/src/auth.ts, then kills the
#      servers and removes all temp state. Three phases:
#        DEV   (port 13941): login/logout/status/cookie attrs/protected routes/
#                            public-route audit sweep
#        RATE  (port 13942): login brute-force rate limit (10/15min -> 429)
#        PROD  (port 13943): NODE_ENV=production + COOKIE_DOMAIN=.example.com
#                            -> Set-Cookie must carry Domain + Secure
#   2. Writes a results log to /tmp/auth-acceptance-results.txt.
#
# Idempotent: any leftover test server on the test ports is killed first.
# It never touches the real repo DB, real .env files, or git.
# =============================================================================
set -u

APP="$(cd "$(dirname "$0")/../.." && pwd)"          # repo root (npm workspace root)
API_SRC="$APP/apps/api/src/index.ts"
TSX="$APP/node_modules/.bin/tsx"
LOG=/tmp/auth-acceptance-results.txt

PORT_DEV=13941
PORT_RATE=13942
PORT_PROD=13943
TEST_PW="acceptance-test-password-7391"

WORK="$(mktemp -d /tmp/auth-acceptance.XXXXXXXX)"
PASS=0
FAIL=0

: > "$LOG"
log()  { printf '%s\n' "$*" | tee -a "$LOG"; }
pass() { PASS=$((PASS+1)); log "PASS  $1"; }
fail() { FAIL=$((FAIL+1)); log "FAIL  $1 -- $2"; }

kill_port() { # kill whatever listens on a tcp port (best effort)
  local port="$1"
  local pids
  pids="$(ss -tlnp 2>/dev/null | grep -E ":$port " | grep -oP 'pid=\K[0-9]+' | sort -u || true)"
  for p in $pids; do kill "$p" 2>/dev/null || true; done
  sleep 1
}

start_server() { # $1=port, $2=extra env assignments
  local port="$1"
  local extra="${2:-}"
  local wdir="$WORK/server-$port"
  kill_port "$port"
  mkdir -p "$wdir/data"
  # shellcheck disable=SC2086
  ( cd "$wdir/data" && \
      env PORT="$port" ADMIN_PASSWORD="$TEST_PW" $extra \
      "$TSX" "$API_SRC" >"$wdir/server.log" 2>&1 & echo $! > "$wdir/pid" )
}

wait_up() { # $1=port
  local port="$1" i
  for i in $(seq 1 60); do
    if curl -sf --max-time 2 "http://127.0.0.1:$port/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.5
  done
  return 1
}

stop_server() { # $1=port
  local pidf="$WORK/server-$1/pid"
  if [ -f "$pidf" ]; then kill "$(cat "$pidf")" 2>/dev/null || true; fi
  kill_port "$1"
}

cleanup() { stop_server "$PORT_DEV"; stop_server "$PORT_RATE"; stop_server "$PORT_PROD"; rm -rf "$WORK"; }
trap cleanup EXIT

# --- curl helpers -------------------------------------------------------------
HFILE="$WORK/headers.txt"
api() { # $1=method $2=url $3=data-or-empty $4=cookie-jar-cookie-or-empty ; prints: "<code> <body>"
  local method="$1" url="$2" data="$3" cookie="$4"
  local args=(-s -o "$WORK/body.txt" -D "$HFILE" -w '%{http_code}' -X "$method" "$url")
  [ -n "$data" ]   && args+=(-H 'Content-Type: application/json' --data "$data")
  [ -n "$cookie" ] && args+=(-H "Cookie: $cookie")
  local code; code="$(curl "${args[@]}")"
  printf '%s %s' "$code" "$(cat "$WORK/body.txt")"
}
set_cookie_line() { grep -i '^set-cookie:' "$HFILE" | head -1 || true; }
mask_token() { sed -E 's/^(set-cookie:[[:space:]]*dm_session=)[^;]*/\1<session-token-masked>/i'; }

log "=================================================================="
log "Digital Mazdoor auth acceptance run — $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
log "APP=$APP   PW=throwaway-test-value"
log "=================================================================="

# =============================================================================
# PHASE 1: DEV (NODE_ENV unset) — full scenario suite
# =============================================================================
log ""
log "### PHASE 1: DEV mode (no NODE_ENV, no COOKIE_DOMAIN) on :$PORT_DEV"
start_server "$PORT_DEV" ""
wait_up "$PORT_DEV" || { log "FATAL: dev server did not start; see $WORK/server-$PORT_DEV/server.log"; exit 1; }
BASE="http://127.0.0.1:$PORT_DEV"

# --- S1: wrong password -> 401 ------------------------------------------------
out="$(api POST "$BASE/api/auth/login" '{"password":"wrong-password"}' "")"
code="${out%% *}"; body="${out#* }"
if [ "$code" = "401" ] && printf '%s' "$body" | grep -q 'Invalid password'; then
  pass "S1 wrong password -> 401 Invalid password"
else fail "S1 wrong password" "got [$code] $body"; fi

# --- S2: correct password -> 200 + Set-Cookie attributes -----------------------
out="$(api POST "$BASE/api/auth/login" "{\"password\":\"$TEST_PW\"}" "")"
code="${out%% *}"
sc="$(set_cookie_line)"
sce="$(printf '%s' "$sc" | mask_token)"
if [ "$code" = "200" ] && [ -n "$sc" ]; then
  pass "S2 correct password -> 200 with Set-Cookie"
  log "    dev Set-Cookie: $sce"
else fail "S2 correct password login" "got [$code] sc=[$sce]"; fi
attrs_ok=1; attrs_why=""
printf '%s' "$sc" | grep -qi 'dm_session='          || { attrs_ok=0; attrs_why="$attrs_why missing dm_session;"; }
printf '%s' "$sc" | grep -q 'HttpOnly'              || { attrs_ok=0; attrs_why="$attrs_why missing HttpOnly;"; }
printf '%s' "$sc" | grep -q 'SameSite=Strict'       || { attrs_ok=0; attrs_why="$attrs_why missing SameSite=Strict;"; }
printf '%s' "$sc" | grep -q 'Path=/'                || { attrs_ok=0; attrs_why="$attrs_why missing Path=/;"; }
printf '%s' "$sc" | grep -qi 'Domain='              && { attrs_ok=0; attrs_why="$attrs_why UNEXPECTED Domain;"; }
printf '%s' "$sc" | grep -qi '[;] Secure'           && { attrs_ok=0; attrs_why="$attrs_why UNEXPECTED Secure;"; }
printf '%s' "$sc" | grep -q 'Max-Age=2592000'       || { attrs_ok=0; attrs_why="$attrs_why missing Max-Age=2592000;"; }
if [ "$attrs_ok" = "1" ]; then
  pass "S2 cookie attrs: HttpOnly + SameSite=Strict + Path=/, NO Domain, NO Secure, Max-Age=2592000"
else fail "S2 cookie attrs" "$attrs_why sc=[$sce]"; fi
COOKIE="$(printf '%s' "$sc" | sed -E 's/^[Ss]et-[Cc]ookie:[[:space:]]*//; s/;.*//' | tr -d '\r')"

# --- S3: status with/without cookie -------------------------------------------
out="$(api GET "$BASE/api/auth/status" "" "$COOKIE")"
code="${out%% *}"; body="${out#* }"
if [ "$code" = "200" ] && printf '%s' "$body" | grep -q '"authenticated":true'; then
  pass "S3 status with cookie -> 200 authenticated:true"
else fail "S3 status with cookie" "got [$code] $body"; fi

out="$(api GET "$BASE/api/auth/status" "" "")"
code="${out%% *}"; body="${out#* }"
if [ "$code" = "200" ] && printf '%s' "$body" | grep -q '"authenticated":false'; then
  pass "S3 status without cookie -> 200 authenticated:false (public by design, not 401)"
else fail "S3 status without cookie" "got [$code] $body"; fi

# --- S4: protected endpoints with/without cookie -------------------------------
out="$(api GET "$BASE/api/alerts" "" "")"
code="${out%% *}"
[ "$code" = "401" ] && pass "S4 GET /api/alerts unauthenticated -> 401" \
  || fail "S4 GET /api/alerts unauthenticated" "got [$code]"

out="$(api GET "$BASE/api/alerts" "" "$COOKIE")"
code="${out%% *}"
[ "$code" = "200" ] && pass "S4 GET /api/alerts with cookie -> 200" \
  || fail "S4 GET /api/alerts with cookie" "got [$code] $(cat "$WORK/body.txt")"

out="$(api GET "$BASE/api/keywords/overview" "" "")"   # auth gate runs before handler
code="${out%% *}"
[ "$code" = "401" ] && pass "S4 GET /api/keywords/overview unauthenticated -> 401" \
  || fail "S4 GET /api/keywords/overview unauthenticated" "got [$code]"

out="$(api POST "$BASE/api/contact" '{"name":"t","email":"t@t.co","subject":"s","message":"hello"}' "")"
code="${out%% *}"
[ "$code" = "201" ] && pass "S4 POST /api/contact unauthenticated -> 201 (public by design: public contact page; honeypot + 5/hr/IP rate limit)" \
  || fail "S4 POST /api/contact unauthenticated" "got [$code]"

# --- S5: logout -> clears cookie + destroys server-side session ----------------
out="$(api POST "$BASE/api/auth/logout" "" "$COOKIE")"
code="${out%% *}"
sc="$(set_cookie_line)"; sce="$(printf '%s' "$sc" | mask_token)"
clear_ok=1; clear_why=""
[ "$code" = "200" ] || { clear_ok=0; clear_why="status $code;"; }
printf '%s' "$sc" | grep -q 'dm_session=;'              || { clear_ok=0; clear_why="${clear_why}no empty dm_session;"; }
printf '%s' "$sc" | grep -q 'Max-Age=0'                 || { clear_ok=0; clear_why="${clear_why}no Max-Age=0;"; }
printf '%s' "$sc" | grep -qi 'Domain='                 && { clear_ok=0; clear_why="${clear_why}UNEXPECTED Domain;"; }
printf '%s' "$sc" | grep -qi '[;] Secure'              && { clear_ok=0; clear_why="${clear_why}UNEXPECTED Secure;"; }
if [ "$clear_ok" = "1" ]; then
  pass "S5 logout -> 200, Set-Cookie clears session (dm_session=; Max-Age=0), no Domain/Secure in dev"
else fail "S5 logout clearing" "$clear_why sc=[$sce]"; fi

out="$(api GET "$BASE/api/auth/status" "" "$COOKIE")"
code="${out%% *}"; body="${out#* }"
if [ "$code" = "200" ] && printf '%s' "$body" | grep -q '"authenticated":false'; then
  pass "S5 status with OLD cookie after logout -> 200 authenticated:false (session invalidated)"
else fail "S5 status with old cookie after logout" "got [$code] $body"; fi

out="$(api GET "$BASE/api/alerts" "" "$COOKIE")"
code="${out%% *}"
[ "$code" = "401" ] && pass "S5 protected route with OLD cookie after logout -> 401" \
  || fail "S5 protected route with old cookie after logout" "got [$code]"

# --- S6: public-route audit sweep (unauthenticated GET/POST) -------------------
log ""
log "--- S6 public-route audit: every /api/* route unauthenticated (expect 401 except exempt auth endpoints)"
declare -A SWEEP=(
  ["/api/auth/status"]=200
  ["/api/auth/logout"]=200
  ["/api/alerts"]=401 ["/api/alerts/tracked"]=401
  ["/api/rank-check"]=401 ["/api/category-report"]=401
  ["/api/keywords/overview"]=401 ["/api/keywords/full"]=401
  ["/api/competitors/top"]=401 ["/api/listings/search"]=401 ["/api/trend-buzz"]=401
  ["/api/keyword-gap"]=401
  ["/api/compare-listings"]=401 ["/api/competitor-tags"]=401 ["/api/hot-products"]=401
  ["/api/listing-audit"]=401 ["/api/shop-analytics"]=401 ["/api/tag-optimizer"]=401
  ["/api/top-sellers"]=401
  ["/api/monthly-trends"]=401 ["/api/trends"]=401
  ["/api/shops/tracked"]=401 ["/api/shops/1/velocity"]=401
  ["/api/tools/category-finder"]=401 ["/api/tools/keyword-lists"]=401
  ["/api/tools/seasonal-calendar"]=401
  ["/api/ai/status"]=401
  ["/api/google-ads/status"]=401 ["/api/google-ads/connect"]=401
  ["/api/google-ads/callback"]=401 ["/api/google-ads/keyword-ideas"]=401
  ["/api/google-ads/countries"]=401 ["/api/google-ads/history"]=401
)
for path in "${!SWEEP[@]}"; do
  want="${SWEEP[$path]}"
  if [ "$path" = "/api/auth/logout" ]; then
    out="$(api POST "$BASE$path" "" "")"
  else
    out="$(api GET "$BASE$path" "" "")"
  fi
  code="${out%% *}"
  if [ "$code" = "$want" ]; then pass "S6 $path -> $code (expected $want)"
  else fail "S6 $path unauthenticated" "expected $want, got [$code]"; fi
done
for path in "/api/tools/fee-calculator" "/api/keywords/bulk" \
            "/api/alerts/check" "/api/alerts/read" "/api/alerts/track" \
            "/api/shops/track" "/api/shops/snapshot-all" \
            "/api/ai/titles" "/api/ai/tags" "/api/ai/descriptions" \
            "/api/ai/listing" "/api/ai/keyword-analysis" \
            "/api/tools/ads-roi" "/api/tools/keyword-lists"; do
  out="$(api POST "$BASE$path" '{}' "")"
  code="${out%% *}"
  if [ "$code" = "401" ]; then pass "S6 POST $path unauthenticated -> 401"
  else fail "S6 POST $path unauthenticated" "expected 401, got [$code]"; fi
done
for path in "/api/alerts/tracked/somekeyword" "/api/shops/tracked/1" "/api/tools/keyword-lists/1"; do
  out="$(api DELETE "$BASE$path" "" "")"
  code="${out%% *}"
  if [ "$code" = "401" ]; then pass "S6 DELETE $path unauthenticated -> 401"
  else fail "S6 DELETE $path unauthenticated" "expected 401, got [$code]"; fi
done
out="$(api GET "$BASE/health" "" "")"
[ "${out%% *}" = "200" ] && pass "S6 GET /health -> 200 (public monitoring)" \
  || fail "S6 GET /health" "got [${out%% *}]"

stop_server "$PORT_DEV"
log "--- dev server stopped"

# =============================================================================
# PHASE 2: RATE LIMIT — fresh server, 11 rapid bad logins -> 429 on the 11th
# =============================================================================
log ""
log "### PHASE 2: login rate limit (10 attempts / 15 min / IP) on :$PORT_RATE"
start_server "$PORT_RATE" ""
wait_up "$PORT_RATE" || { log "FATAL: rate server did not start"; exit 1; }
BASE="http://127.0.0.1:$PORT_RATE"
codes=""
for i in $(seq 1 11); do
  out="$(api POST "$BASE/api/auth/login" '{"password":"wrong-password"}' "")"
  code="${out%% *}"
  codes="$codes $code"
done
log "attempt status codes:$codes"
first10_ok=1
set -- $codes
for i in 1 2 3 4 5 6 7 8 9 10; do
  eval "c=\${$i}"
  [ "$c" = "401" ] || first10_ok=0
done
eval "c11=\${11}"
if [ "$first10_ok" = "1" ] && [ "$c11" = "429" ]; then
  pass "S7 rate limit: 10x401 then 429 on 11th attempt within 15 min window"
else fail "S7 rate limit" "codes:$codes (expected ten 401s then 429)"; fi
if grep -qi '^retry-after:' "$HFILE"; then
  pass "S7 429 carries Retry-After header: $(grep -i '^retry-after:' "$HFILE" | tr -d '\r')"
else fail "S7 Retry-After header" "missing on 429 response"; fi
stop_server "$PORT_RATE"
log "--- rate server stopped"

# =============================================================================
# PHASE 3: PROD (NODE_ENV=production, COOKIE_DOMAIN=.example.com)
# =============================================================================
log ""
log "### PHASE 3: PROD mode (NODE_ENV=production, COOKIE_DOMAIN=.example.com) on :$PORT_PROD"
start_server "$PORT_PROD" "NODE_ENV=production COOKIE_DOMAIN=.example.com"
wait_up "$PORT_PROD" || { log "FATAL: prod server did not start"; exit 1; }
BASE="http://127.0.0.1:$PORT_PROD"

out="$(api POST "$BASE/api/auth/login" "{\"password\":\"$TEST_PW\"}" "")"
code="${out%% *}"
sc="$(set_cookie_line)"; sce="$(printf '%s' "$sc" | mask_token)"
[ "$code" = "200" ] && [ -n "$sc" ] && pass "S8 prod login -> 200 with Set-Cookie" \
  || fail "S8 prod login" "got [$code] sc=[$sce]"
log "    prod Set-Cookie: $sce"
prod_ok=1; prod_why=""
printf '%s' "$sc" | grep -q 'Domain=\.example\.com' || { prod_ok=0; prod_why="${prod_why}missing Domain=.example.com;"; }
printf '%s' "$sc" | grep -q '[;] Secure'            || { prod_ok=0; prod_why="${prod_why}missing Secure;"; }
printf '%s' "$sc" | grep -q 'HttpOnly'              || { prod_ok=0; prod_why="${prod_why}missing HttpOnly;"; }
printf '%s' "$sc" | grep -q 'SameSite=Strict'       || { prod_ok=0; prod_why="${prod_why}missing SameSite=Strict;"; }
printf '%s' "$sc" | grep -q 'Path=/'                || { prod_ok=0; prod_why="${prod_why}missing Path=/;"; }
if [ "$prod_ok" = "1" ]; then
  pass "S8 prod cookie attrs: Domain=.example.com + Secure + HttpOnly + SameSite=Strict + Path=/"
else fail "S8 prod cookie attrs" "$prod_why sc=[$sce]"; fi
PCOOKIE="$(printf '%s' "$sc" | sed -E 's/^[Ss]et-[Cc]ookie:[[:space:]]*//; s/;.*//' | tr -d '\r')"

out="$(api POST "$BASE/api/auth/logout" "" "$PCOOKIE")"
sc="$(set_cookie_line)"; sce="$(printf '%s' "$sc" | mask_token)"
if printf '%s' "$sc" | grep -q 'Max-Age=0' && printf '%s' "$sc" | grep -q 'Domain=\.example\.com' && printf '%s' "$sc" | grep -q '[;] Secure'; then
  pass "S8 prod logout clearing cookie carries Domain=.example.com + Secure + Max-Age=0"
else fail "S8 prod logout clearing" "sc=[$sce]"; fi

out="$(api GET "$BASE/api/auth/status" "" "$PCOOKIE")"
body="${out#* }"
printf '%s' "$body" | grep -q '"authenticated":false' \
  && pass "S8 prod old-cookie status after logout -> authenticated:false" \
  || fail "S8 prod old-cookie status after logout" "got [$body]"

out="$(api GET "$BASE/api/alerts" "" "")"
[ "${out%% *}" = "401" ] && pass "S8 prod protected route unauthenticated -> 401" \
  || fail "S8 prod protected route unauthenticated" "got [${out%% *}]"

stop_server "$PORT_PROD"
log "--- prod server stopped"

# =============================================================================
log ""
log "=================================================================="
log "RESULT: $PASS passed, $FAIL failed"
log "NOTE: session-expiry (30-day sliding TTL) is NOT exercised here — the"
log "window is too long for a live test. Invalidation is covered via logout"
log "(S5/S8: server-side session destroyed -> old cookie rejected)."
log "=================================================================="
[ "$FAIL" -eq 0 ]
