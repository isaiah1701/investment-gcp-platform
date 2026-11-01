# Sky

Sky is a single page weather app for checking current conditions and the forecast in any city. It uses WeatherAPI for live city search and forecasts, with a deterministic mock mode for offline use.

## Features

- City search with selectable locations, country and region context, and keyboard navigation.
- Current conditions, local city time, high and low, feels-like temperature, humidity, wind, UV and precipitation when supplied.
- Scrollable 24 hour outlook, interactive temperature chart, and timezone-aware seven day forecast.
- Celsius and Fahrenheit display with consistent conversion across the page.
- Weather specific gradients, reduced motion support, responsive layouts, loading feedback, and retryable error states.
- WeatherAPI city search and live current conditions, hourly and daily forecasts (up to seven days when the plan supports it).
- Visibility, cloud cover, wind gusts, sunrise and sunset alongside the core weather details.
- Deterministic, credential-free mock mode for offline development.

## Architecture

Next.js App Router serves the single page application and JSON Route Handlers from one Node.js process on port 3000. WeatherAPI data is normalized into the same strict TypeScript report used by mock mode. The API key stays on the server, provider fields are validated, requests time out after eight seconds, and successful responses are cached for fifteen minutes. API errors return structured messages without exposing stack traces or the key.

```text
src/
  app/                 Sky page, global styles, and API Route Handlers
  components/          Search, weather hero, forecast, chart, and detail cards
  data/                Deterministic predefined cities and mock forecasts
  lib/                 Provider adapter, normalized types, and weather utilities
tests/                 Unit and API Route Handler tests
public/                Sky application icon
```

## Weather data mode

`WEATHER_DATA_MODE` accepts `mock` or `live`. The root `.env` selects `live` and reads `WEATHER_API_KEY`; the Next.js configuration loads this root env file while running the app from `app/`. Never add the key to client-side code. WeatherAPI's Forecast endpoint returns daily and hourly forecast data; availability and forecast length depend on the WeatherAPI plan. The app requests seven days and automatically retries with three if the plan only supports WeatherAPI's free three-day forecast. Mock mode includes London, New York, Tokyo, Reykjavik, Sydney, Cape Town, San Francisco, Paris, and Dubai, and needs no internet connection or key.

## Local development

Requires Node.js 24 and npm.

```bash
cd app
npm ci
npm run dev
```

Open `http://localhost:3000`. The root `.env` is loaded automatically. Use `WEATHER_DATA_MODE=mock` to switch to sample forecasts.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Liveness response; independent of weather providers |
| GET | `/api/ready` | Readiness response; independent of weather providers |
| GET | `/healthz` | Kubernetes liveness probe |
| GET | `/readyz` | Kubernetes readiness probe |
| GET | `/metrics` | Prometheus HTTP and WeatherAPI metrics |
| GET | `/api/locations?q=London` | Search mock cities or WeatherAPI locations |
| GET | `/api/weather?cityId=weatherapi%3A2801268` | Normalized current conditions and hourly/daily forecasts |

Invalid requests use appropriate 4xx responses. Provider failures return a structured 502 response; health and readiness remain available in either data mode.

## Validation

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm audit --omit=dev
```

## Production Dockerfile

The root `Dockerfile` uses `deps → builder → runner` stages based on the same digest-pinned official Node.js 24 Debian slim image. The dependency stage copies only the package manifests before running `npm ci` with a BuildKit npm cache mount. The builder enables Next.js standalone output; the final stage contains the standalone server, static assets, and public assets.

The container listens on port 3000 and starts with `node server.js`. It runs as UID/GID `10001`, installs no runtime dependencies, removes npm tooling from the runner, uses exec-form startup for SIGTERM handling, and includes an HTTP health check implemented with Node.js. The `/app/.next/cache` path points to `/tmp/next-cache` for deployments with a read-only root filesystem; mount writable temporary storage at `/tmp` when required. `WEATHER_DATA_MODE=mock` is the container default; live deployments must provide `WEATHER_DATA_MODE=live` and `WEATHER_API_KEY` as runtime environment variables.

Example commands for later use (not run during this work):

```bash
docker build -t sky:local .
docker run --rm -p 3000:3000 \
  -e WEATHER_DATA_MODE=live \
  -e WEATHER_API_KEY="$WEATHER_API_KEY" \
  sky:local
```

## GKE deployment

See the repository root's `docs/deployment.md` and `docs/DEPLOYMENT-HANDOVER.md` for the Terraform, Argo CD, Secret Manager, DNS and verification status. The GKE workload reads the WeatherAPI key from a Secret Manager CSI mount at runtime; it does not need the key in a Kubernetes environment variable.
