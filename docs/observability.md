# Observability

Equity keeps the existing Prometheus and Grafana stack. The chart creates a ServiceMonitor, Prometheus alerts, and an Equity overview dashboard. No monitoring stack or additional workload is introduced.

Application metrics at `/metrics`:

- `equity_http_requests_total` and `equity_http_request_duration_seconds` — request count and latency with fixed route/method/status labels.
- `equity_alpha_vantage_api_requests_total` and `equity_alpha_vantage_request_duration_seconds` — provider function, outcome and latency.
- `equity_market_cache_requests_total` — search/quote/history cache hits, misses and stale responses.

Metric labels never contain ticker input, search text, provider payloads or credentials. Logs are structured JSON with a correlation ID, method, route, status and duration; provider URLs and API keys are not logged.

The existing Grafana host remains `https://grafana.depl0y.site`. The new Equity dashboard definition is in `observability/equity-dashboard.json`. Application health and readiness are available at `/healthz` and `/readyz`; neither endpoint calls Alpha Vantage.
