# Sky observability

Argo CD installs Prometheus, Grafana, the operator, kube-state-metrics and node-exporter with two-day in-memory Prometheus retention. Grafana auto-loads the six-panel **Sky Overview** dashboard from a labeled ConfigMap. Prometheus has a ClusterIP service only.

Sky exposes `/metrics` with low-cardinality HTTP counters and latency histograms plus WeatherAPI success, failure and request latency. Four custom rules cover unavailable scrape target, elevated 5xx ratio, high p95 latency with request volume, and repeated pod restarts.

Open `https://grafana.depl0y.site` after DNS/TLS are active. Verify Prometheus at `http://localhost:9090/targets` after running `kubectl -n monitoring port-forward svc/kube-prometheus-stack-prometheus 9090:9090`.
