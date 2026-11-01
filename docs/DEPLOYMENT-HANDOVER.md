# Sky GKE platform handover

**Status (2026-11-01): GKE infrastructure is provisioned, GitOps is synced, and Sky is running with live WeatherAPI data.** The in-cluster smoke check passed. Public HTTPS is waiting on the domain's nameserver delegation to Cloud DNS; the registrar still delegates to GoDaddy.

## Project and infrastructure

| Output | Actual value / state |
|---|---|
| GCP project | `project-97e92755-cd8e-4b21-851` (configured and ACTIVE) |
| gcloud configuration | `sky-prod` |
| Billing | Enabled |
| Region / zone | `europe-west2` / `europe-west2-a` |
| Machine type | `e2-standard-4`, 4 vCPU, 16,384 MB, available in the selected zone |
| CPU quota | 12 vCPU regional quota; usage 0 before provisioning |
| State bucket | `sky-tfstate-project-97e92755-cd8e-4b21-851` (VERIFIED; `EUROPE-WEST2`, versioning enabled, uniform bucket access, public access prevention enforced) |
| Required APIs | VERIFIED enabled: Compute, GKE, IAM, STS, Artifact Registry, Secret Manager, Cloud DNS, Storage and Service Usage |
| GKE cluster | `sky-prod`, zonal `europe-west2-a`, node `e2-standard-4`; Ready |
| Artifact Registry | `europe-west2-docker.pkg.dev/project-97e92755-cd8e-4b21-851/sky/sky` |
| Secret Manager secret | `sky-weather-api-key`; version 1 populated from root `.env`, value not logged |
| Cloud DNS zone | `sky-public`; records and nameservers provisioned |
| Workload Identity | GKE secret access and GitHub Actions federation configured |

## DNS and public endpoints

The current public delegation for `depl0y.site` still resolves to `ns71.domaincontrol.com` and `ns72.domaincontrol.com`. Update the domain at GoDaddy to use all four Cloud DNS nameservers below. The Cloud DNS zone already has A records for all three hosts.

| Host | Planned URL | State |
|---|---|---|
| Sky | <https://sky.depl0y.site> | App healthy; HTTPS awaits DNS delegation and managed certificate |
| Argo CD | <https://argocd.depl0y.site> | Ingress provisioned; HTTPS awaits DNS delegation and managed certificate |
| Grafana | <https://grafana.depl0y.site> | Ingress provisioned; HTTPS awaits DNS delegation and managed certificate |
| Prometheus | Internal only; `kubectl -n monitoring port-forward svc/kube-prometheus-stack-prometheus 9090:9090` | Running; Sky target reports `up=1` |

Cloud DNS nameservers to enter at the registrar:

```text
ns-cloud-c1.googledomains.com.
ns-cloud-c2.googledomains.com.
ns-cloud-c3.googledomains.com.
ns-cloud-c4.googledomains.com.
```

Reserved ingress IPs: Sky `136.82.25.190`, Argo CD `136.69.86.228`, Grafana `34.128.158.229`.

Verify delegation with `dig NS depl0y.site`, then wait for Google-managed certificates to become Active. Recheck HTTPS at all three hostnames after DNS and certificate provisioning complete.

## Authentication and operations

ADC is configured and verified. Connect with `gcloud config configurations activate sky-prod` and `gcloud container clusters get-credentials sky-prod --project project-97e92755-cd8e-4b21-851 --zone europe-west2-a`.

Argo CD user will be `admin`; retrieve the initial password from `argocd-initial-admin-secret` using the command in `docs/deployment.md`. Grafana user is `admin`; retrieve the generated password from `sky-grafana-admin` using that runbook. Passwords are generated and stored only in Kubernetes at bootstrap; they are not committed.

Prometheus port-forward: `kubectl -n monitoring port-forward svc/kube-prometheus-stack-prometheus 9090:9090`.

Grafana dashboard: **Sky Overview** at `/d/sky-overview/sky-overview` after login. Custom alerts: `SkyDown`, `SkyHighErrorRate`, `SkyHighLatency`, `SkyPodRestarts`.

## CI/CD and GitOps

| Check / workflow | Result |
|---|---|
| App unit tests | VERIFIED: 9 local tests and GitHub workflow succeeded |
| App lint | VERIFIED: zero errors or warnings, locally and in GitHub |
| App typecheck | VERIFIED locally and in GitHub |
| Production app build | VERIFIED locally and in GitHub |
| Live WeatherAPI smoke | VERIFIED locally: location search and current/hourly/daily forecast passed; key was not output |
| Terraform fmt / validate | VERIFIED locally and in GitHub with Google provider 6.50.0 |
| Checkov / Trivy Terraform | VERIFIED: GitHub Terraform CI passed |
| GitOps Helm/YAML/schema validation | VERIFIED: GitHub workflow passed; 17 CRD resources skipped by kubeconform because their schemas are supplied by the cluster operators |
| Docker image / Trivy image scan | VERIFIED: workflow `41315169676` passed |
| Image promotion | VERIFIED: digest `sha256:a8300660540f400d4857e05d1f36fec1478504120b0b269bed74b08f88fe5c7b` in GitOps commit `5b68efa` |
| Terraform apply | VERIFIED: 42 resources created, then 7 remaining; replaced the initial conditional project IAM grant with a secret-level grant |
| Argo CD reconciliation | VERIFIED: root and child apps synced; monitoring Healthy; Sky/edge are waiting only for DNS-backed managed certificates |
| Live GKE smoke | VERIFIED: `/healthz`, `/readyz`, `/metrics`, city search and live current/hourly/daily forecast passed through the Sky Service |
| Prometheus scrape | VERIFIED: `up{job="sky"}` returned `1` |
| kube-bench | Workflow `41316340957` completed; 12 PASS, 1 FAIL, 54 WARN. Report artifact: `kube-bench-results`. The FAIL is worker `eventRecordQPS`; review it alongside the GKE managed-service warnings. |

The actual Git remote is private `isaiah1701/wealth-os-gke-platform` (default branch `main`). Production source and deployment configuration are on `main`; latest infrastructure/GitOps fix before this handover is `a417840`. The GitHub image workflow uses separate WIF identities for Terraform, image publishing and audit. GitHub variables are configured from Terraform outputs.

Sky image digest is pinned in GitOps; Argo CD follows `main` and will reconcile future image promotions automatically.

## Cost estimate

Budget roughly **$140–$230/month before NAT traffic, persistent disk, logs, DNS queries and internet egress** for one always-on `e2-standard-4` node, one zonal cluster, three global HTTPS Ingress frontends and Cloud NAT. This includes about $120–$140/month for the VM, up to $73/month for GKE management, and $18.25/month for the first five global forwarding rules. The $74.40/month GKE free tier may offset one eligible zonal cluster. Recheck with the [Google Cloud pricing calculator](https://cloud.google.com/products/calculator) and actual billing account. Sources: [GKE pricing](https://cloud.google.com/kubernetes-engine/pricing), [global load-balancer pricing](https://cloud.google.com/load-balancing/pricing).

## Rollback, cleanup, troubleshooting

- Roll back an app by reverting the Git commit that updates `gitops/values/app-values.yaml`; Argo CD reconciles the previous digest.
- Inspect cluster and Argo CD state with `kubectl get pods -A` and `kubectl -n argocd get applications`.
- Inspect Ingress/certificates with `kubectl get ingress,managedcertificate -A`; check delegation with `dig NS depl0y.site`.
- Before intentional teardown, change GKE `deletion_protection` to false and remove the Secret Manager `prevent_destroy` guard in a reviewed change, apply those changes, then run `terraform -chdir=terraform/environments/prod destroy -var-file=terraform.tfvars`. After state is no longer needed, remove the bootstrap bucket with `gcloud storage rm -r gs://sky-tfstate-project-97e92755-cd8e-4b21-851`.

## Remaining manual actions

1. At GoDaddy, replace `ns71.domaincontrol.com` and `ns72.domaincontrol.com` with the four `ns-cloud-*.googledomains.com` nameservers listed above.
2. Wait for DNS delegation and Google-managed certificates to become Active; then verify the three HTTPS endpoints.
3. Review the kube-bench artifact, especially the worker `eventRecordQPS` finding and GKE managed-service warnings.
