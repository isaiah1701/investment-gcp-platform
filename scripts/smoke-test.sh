#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
BASE_URL="${BASE_URL%/}"

echo "Checking Equity endpoints at ${BASE_URL}"
curl -fsS "$BASE_URL/healthz" | python3 -c 'import json,sys; assert json.load(sys.stdin)["status"] == "ok"'
curl -fsS "$BASE_URL/readyz" | python3 -c 'import json,sys; assert json.load(sys.stdin)["status"] == "ready"'
curl -fsS "$BASE_URL/metrics" | grep -q '^equity_http_requests_total'
SEARCH="$(curl -fsS --get --data-urlencode 'q=AAPL' "$BASE_URL/api/stocks/search")"
SYMBOL="$(printf '%s' "$SEARCH" | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"][0]["symbol"])')"
QUOTE="$(curl -fsS "$BASE_URL/api/stocks/${SYMBOL}/quote")"
HISTORY="$(curl -fsS "$BASE_URL/api/stocks/${SYMBOL}/history")"
printf '%s' "$QUOTE" | python3 -c 'import json,sys; q=json.load(sys.stdin); assert q["data"]["price"] > 0 and q["mode"] in ("mock", "live")'
printf '%s' "$HISTORY" | python3 -c 'import json,sys; h=json.load(sys.stdin); assert h["data"] and h["mode"] in ("mock", "live")'
if printf '%s%s' "$QUOTE" "$HISTORY" | grep -q 'INVESTMENT_API_KEY'; then
  echo "Investment API key name unexpectedly appeared in a response." >&2
  exit 1
fi
echo "Health, readiness, metrics, search, quote, and daily history checks passed."
