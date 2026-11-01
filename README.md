# Sky weather platform

Sky is a Next.js weather dashboard with WeatherAPI search and forecasts. The app source is in [`app/`](app/); the root Dockerfile builds it from the repository root.

## Run locally

Create root `.env` with `WEATHER_API_KEY=...`, then run `cd app && npm ci && npm run dev`. The root `.env` is ignored by Git and Docker. Unit tests, lint, typecheck and production build are available as npm scripts in `app/`.

## Deploy to GKE

See [the deployment runbook](docs/deployment.md), [architecture](docs/architecture.md), [observability](docs/observability.md) and [current handover/status](docs/DEPLOYMENT-HANDOVER.md). The Cloud platform uses Terraform, Artifact Registry, Google Secret Manager, Argo CD, Prometheus and Grafana. Terraform requires both the `sky-prod` gcloud account and local ADC.

Build the container from the repository root with `docker build -t sky:local .`.
