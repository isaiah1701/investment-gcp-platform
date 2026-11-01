#!/usr/bin/env bash
set -euo pipefail
PROJECT_ID="${PROJECT_ID:-project-97e92755-cd8e-4b21-851}"
SECRET_NAME="${SECRET_NAME:-sky-weather-api-key}"
ENV_FILE="${ENV_FILE:-.env}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
chmod 700 "$TMP_DIR"
python3 - "$ENV_FILE" "$TMP_DIR/weather-api-key" <<'PY'
import sys
from pathlib import Path

env_path, output_path = map(Path, sys.argv[1:])
for line in env_path.read_text().splitlines():
    if line.startswith("WEATHER_API_KEY="):
        value = line.split("=", 1)[1].strip().strip("\"'")
        if value:
            output_path.write_text(value)
            output_path.chmod(0o600)
            raise SystemExit(0)
raise SystemExit("WEATHER_API_KEY is missing from the root .env file")
PY
gcloud secrets versions add "$SECRET_NAME" --project="$PROJECT_ID" --data-file="$TMP_DIR/weather-api-key" >/dev/null
echo "Weather API secret version uploaded to Secret Manager (value suppressed)."
