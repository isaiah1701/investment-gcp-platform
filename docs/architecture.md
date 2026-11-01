# Architecture

## Equity application

Equity is a Next.js 15 app with a small server-side market-data layer and a client-side dashboard. Search, quote, and history requests pass through same-origin Next.js routes. The Alpha Vantage key is read only on the server from `INVESTMENT_API_KEY` locally or from the mounted Secret Manager CSI file in GKE. The browser never receives the key or calls the provider directly.

`INVESTMENT_DATA_MODE=mock` is the default for development and tests. Mock values are visibly labelled and never used when `live` mode is configured. Live mode calls `SYMBOL_SEARCH`, `GLOBAL_QUOTE`, and `TIME_SERIES_DAILY` with server-side cache windows, request timeouts, response parsing, rate-limit handling, and explicitly marked stale-cache fallback.

The dashboard tracks US-listed equities in USD to avoid mixing currencies. Holdings, average purchase prices, and watchlist symbols are stored in browser local storage. No account or server-side portfolio database is present. The main chart is for a selected ticker, not simulated portfolio returns.

## Platform

The existing GKE Standard cluster, regional VPC, private node pool, Artifact Registry repository, Workload Identity, Argo CD, Secret Manager CSI driver, Cloud DNS, static external ingress address, Prometheus and Grafana remain unchanged. The Equity chart uses the existing artifact repository (`sky`) with image name `equity`.

To preserve the current public address during a future in-place app migration, the chart retains the existing `sky` Kubernetes namespace, Deployment/Service/Ingress names, service account and static IP resource name. Workload labels, container image, metrics, dashboards and the Argo CD app identity are Equity-specific. The root hostname is `depl0y.site`; `sky.depl0y.site` remains an alias.

## Request path

```text
Browser
  ├─ /api/stocks/search ─┐
  ├─ /api/stocks/:symbol/quote ─┼─ Next.js server → Alpha Vantage
  └─ /api/stocks/:symbol/history ┘

Browser local storage → holdings and watchlist only
GKE probes → /healthz and /readyz
Prometheus → /metrics
```

Health and readiness are independent of Alpha Vantage availability. The provider metrics use bounded function/outcome labels, and HTTP metrics use fixed route labels rather than user search text.
