# Sky GKE architecture

Terraform owns one zonal GKE Standard cluster in `europe-west2-a`, a private VPC, Pod and Service ranges, Cloud NAT, workload identity, Secret Manager metadata, Artifact Registry, three global ingress IPs and a public Cloud DNS zone. The node pool starts with one `e2-standard-4` node to fit Sky, Argo CD and a small Prometheus stack without multi-zone capacity.

Direct Helm installs Argo CD once. Its root Application owns Sky, `kube-prometheus-stack` and ingress certificates. Sky reads its WeatherAPI key through GKE Secret Manager CSI. GitHub Actions uses OIDC/WIF and promotes only scanned immutable image digests. Argo CD is the only application reconciler.

The Fintech Observability Platform reference was inspected. Sky uses its app-of-apps, separate Helm values, immutable image promotion, ServiceMonitor and dashboard provisioning patterns. Unrelated AWS infrastructure and telemetry services were not copied.
