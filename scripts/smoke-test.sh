#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${BASE_URL:-https://sky.depl0y.site}"
BASE_URL="${BASE_URL%/}"

echo "Checking Sky endpoints at ${BASE_URL}"
curl -fsS "$BASE_URL/healthz" | python3 -c 'import json,sys; assert json.load(sys.stdin)["status"] == "ok"'
curl -fsS "$BASE_URL/readyz" | python3 -c 'import json,sys; assert json.load(sys.stdin)["status"] == "ready"'
curl -fsS "$BASE_URL/metrics" | grep -q '^sky_http_requests_total'
LOCATIONS="$(curl -fsS "$BASE_URL/api/locations?q=London")"
CITY_ID="$(printf '%s' "$LOCATIONS" | python3 -c 'import json,sys; print(json.load(sys.stdin)["locations"][0]["id"])')"
WEATHER="$(curl -fsS --get --data-urlencode "cityId=${CITY_ID}" "$BASE_URL/api/weather")"
printf '%s' "$WEATHER" | python3 -c 'import json,sys; report=json.load(sys.stdin)["weather"]; assert report["current"] and report["daily"] and report["hourly"]'
if printf '%s' "$WEATHER" | grep -q 'WEATHER_API_KEY'; then
  echo "Weather API key name unexpectedly appeared in the response." >&2
  exit 1
fi
echo "Health, readiness, metrics, live location search and forecast checks passed."
