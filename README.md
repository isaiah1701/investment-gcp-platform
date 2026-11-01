# Equity

Equity is a small, single-user stock portfolio dashboard. It searches US-listed equities, shows cached end-of-day prices and daily history, and stores a hypothetical watchlist and holdings in browser local storage. It does not trade, connect to a broker, or provide investment advice.

## Local development

The ignored repository-root `.env` is loaded by Next.js when started from `my-apps/investments-app`. Keep `INVESTMENT_API_KEY` server-only; the browser never calls Alpha Vantage directly. `.env.example` documents the variable names without credentials. Mock mode is the default and requires no API key:

```bash
npm ci --prefix my-apps/investments-app
npm run dev --prefix my-apps/investments-app
```

Or run from the app directory:

```bash
cd my-apps/investments-app
npm ci
npm run dev
```

To use the existing local Alpha Vantage key, set `INVESTMENT_DATA_MODE=live` in the root `.env` or in the command environment. Never copy the key into source files, GitHub Actions variables, Docker build arguments, or client-side environment variables.

```bash
INVESTMENT_DATA_MODE=live npm run dev --prefix my-apps/investments-app
```

Alpha Vantage's free key currently allows 25 requests per day. The standard quote endpoint provides end-of-day data; real-time and 15-minute-delayed US quotes are premium. Free daily history returns the latest 100 observations; full history is premium. The app caches searches for one hour, quotes for five minutes, and daily history for six hours. Cached results served after a provider failure are marked stale. Live mode never falls back to mock prices. [Alpha Vantage API docs](https://www.alphavantage.co/documentation/) · [Usage limits](https://www.alphavantage.co/support/)

## Checks

```bash
cd my-apps/investments-app
npm test
npm run lint
npm run typecheck
npm run build
```

Build the container from the repository root:

```bash
docker build -t equity:local .
docker run --rm -p 3000:3000 equity:local
```

The image runs as a non-root user and defaults to labelled mock data. It contains no API key.

## GKE preparation

The existing GKE cluster, Artifact Registry repository, Secret Manager CSI integration, ingress IP, DNS and Prometheus/Grafana stack remain the platform. The app chart keeps the existing `sky` namespace, service, ingress and static IP names to support an in-place app migration; labels and container image identify Equity.

No production image was pushed and no GitOps sync, Terraform apply, DNS change, or Secret Manager mutation was performed for this app replacement. The current GKE workload remains the previous Sky app. The Equity GitOps configuration is local preparation only; see [deployment instructions](docs/deployment.md) and [current handover](docs/DEPLOYMENT-HANDOVER.md).

Before any production rollout, rotate the Alpha Vantage credential because it has appeared in screenshots. Then create `equity-alpha-vantage-api-key` in Secret Manager and grant the existing GKE workload identity access. Do not reuse `sky-weather-api-key`; the new app expects the secret file at `/var/run/secrets/equity/investment-api-key`. The safe post-rotation steps are documented in [deployment instructions](docs/deployment.md).

## Repository layout

- `my-apps/investments-app/` — Equity Next.js app, server API, tests and client dashboard.
- `my-apps/weather-app/` — retained local source backup; it is no longer used by the root Dockerfile or CI.
- `helm/equity/` and `gitops/` — desired Kubernetes and Argo CD configuration.
- `terraform/` — existing GKE platform; unchanged for this app replacement.
- `observability/` — Equity Prometheus dashboard definition.
