# Troubleshooting Equity

## Live prices are unavailable

- Confirm the app is running with `INVESTMENT_DATA_MODE=live` and the backend has `INVESTMENT_API_KEY` locally or the mounted key file in GKE.
- `/healthz` and `/readyz` do not depend on Alpha Vantage; a provider outage should not restart the pod.
- Check the frontend's provider message and request ID. HTTP 429 indicates the daily request limit or a provider plan limit. The free service currently allows 25 API requests per day.
- The Global Quote response is end-of-day by default. Realtime and 15-minute-delayed US market data require a premium plan.
- If a quote is shown as stale, it came from the server cache after a provider error; its fetched timestamp remains visible. Live mode never substitutes demo data.

## No stock results

The MVP searches US-listed equities only so portfolio totals remain in USD. Try a company name or ticker with at least two characters. Non-US listings are intentionally filtered out rather than combined using an assumed exchange rate.

## History range is limited

History uses `TIME_SERIES_DAILY` with `outputsize=compact`, which is available on the free tier and returns the latest 100 observations. Full history is premium. The chart only displays actual returned observations.

## GKE secret mount is missing

The production SecretProviderClass expects the `equity-alpha-vantage-api-key` Secret Manager secret and the existing workload identity service account `sky` in namespace `sky`. The new secret has not been created in this task. Follow [deployment preparation](deployment.md) after rotating the exposed credential; do not point Equity at the weather secret.
