# Sky GKE platform handover

**Status: infrastructure and GitOps code are prepared and validated locally. No GKE cluster or public deployment is claimed.** Terraform apply is blocked until Application Default Credentials are authorized in this WSL environment. The gcloud user account works; the ADC login opened an OAuth URL but WSL has no browser launcher.

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
| GKE cluster | NOT PROVISIONED |
| Artifact Registry | NOT PROVISIONED |
| Secret Manager secret | NOT PROVISIONED; key is excluded from Terraform |
| Cloud DNS zone / static ingress IPs | NOT PROVISIONED |

## DNS and public endpoints

The current public delegation for `depl0y.site` resolves to `ns71.domaincontrol.com` and `ns72.domaincontrol.com`. These are registrar nameservers, not Cloud DNS nameservers. The Cloud DNS zone has not been created, so there are no Google nameserver or IP outputs to enter yet.

| Host | Planned URL | State |
|---|---|---|
| Sky | <https://sky.depl0y.site> | BLOCKED: no cluster, Cloud DNS delegation or certificate |
| Argo CD | <https://argocd.depl0y.site> | BLOCKED: no cluster, Cloud DNS delegation or certificate |
| Grafana | <https://grafana.depl0y.site> | BLOCKED: no cluster, Cloud DNS delegation or certificate |
| Prometheus | <http://localhost:9090> | NOT AVAILABLE; no cluster/service to port-forward |

After Terraform succeeds, retrieve actual values with `terraform -chdir=terraform/environments/prod output -json dns_name_servers` and `terraform -chdir=terraform/environments/prod output`. Enter every returned Cloud DNS nameserver at the registrar, replacing its existing delegation. Do not use sample values.

## Authentication and operations

Terraform needs ADC. Run `gcloud auth application-default login`, complete the Google sign-in in a browser, then confirm `gcloud auth application-default print-access-token >/dev/null` succeeds.

After cluster creation, connect with `gcloud config configurations activate sky-prod` and `gcloud container clusters get-credentials sky-prod --project project-97e92755-cd8e-4b21-851 --zone europe-west2-a`.

Argo CD user will be `admin`; retrieve the initial password from `argocd-initial-admin-secret` using the command in `docs/deployment.md`. Grafana user is `admin`; retrieve the generated password from `sky-grafana-admin` using that runbook. Passwords are generated and stored only in Kubernetes at bootstrap; they are not committed.

Prometheus port-forward: `kubectl -n monitoring port-forward svc/kube-prometheus-stack-prometheus 9090:9090`.

Grafana dashboard: **Sky Overview** at `/d/sky-overview/sky-overview` after login. Custom alerts: `SkyDown`, `SkyHighErrorRate`, `SkyHighLatency`, `SkyPodRestarts`.

## CI/CD and GitOps

| Check / workflow | Result |
|---|---|
| App unit tests | VERIFIED locally: 9 passed |
| App lint | VERIFIED locally: zero errors or warnings |
| App typecheck | VERIFIED locally |
| Production app build | VERIFIED locally: Next.js production build succeeds |
| Live WeatherAPI smoke | VERIFIED locally: location search and current/hourly/daily forecast passed; key was not output |
| Terraform fmt | VERIFIED locally |
| Terraform validate | VERIFIED locally with Google provider 6.50.0 |
| Checkov / Trivy Terraform | NOT RUN locally; GitHub workflows configured |
| Docker image / Trivy image scan | NOT RUN for Artifact Registry; no approved digest |
| Image promotion | NOT RUN |
| Argo CD reconciliation | NOT RUN |
| kube-bench | NOT RUN |

The actual Git remote is private `isaiah1701/wealth-os-gke-platform` (default branch `main`), initially containing only `README.md`. Push the prepared source and GitOps files before Argo CD can fetch them. The workflows use separate WIF service accounts for Terraform, image publishing and audit. Set GitHub repository variables from Terraform outputs: `GCP_WIF_PROVIDER`, `GCP_TERRAFORM_SERVICE_ACCOUNT`, `GCP_IMAGE_SERVICE_ACCOUNT`, `GCP_AUDIT_SERVICE_ACCOUNT`, `GCP_PROJECT_ID`, and `TF_STATE_BUCKET`.

No image digest or GitOps deployment revision exists yet.

## Cost estimate

Budget roughly **$140–$230/month before NAT traffic, persistent disk, logs, DNS queries and internet egress** for one always-on `e2-standard-4` node, one zonal cluster, three global HTTPS Ingress frontends and Cloud NAT. This includes about $120–$140/month for the VM, up to $73/month for GKE management, and $18.25/month for the first five global forwarding rules. The $74.40/month GKE free tier may offset one eligible zonal cluster. Recheck with the [Google Cloud pricing calculator](https://cloud.google.com/products/calculator) and actual billing account. Sources: [GKE pricing](https://cloud.google.com/kubernetes-engine/pricing), [global load-balancer pricing](https://cloud.google.com/load-balancing/pricing).

## Rollback, cleanup, troubleshooting

- Roll back an app by reverting the Git commit that updates `gitops/values/app-values.yaml`; Argo CD reconciles the previous digest.
- Inspect cluster and Argo CD state with `kubectl get pods -A` and `kubectl -n argocd get applications`.
- Inspect Ingress/certificates with `kubectl get ingress,managedcertificate -A`; check delegation with `dig NS depl0y.site`.
- Before intentional teardown, change GKE `deletion_protection` to false and remove the Secret Manager `prevent_destroy` guard in a reviewed change, apply those changes, then run `terraform -chdir=terraform/environments/prod destroy -var-file=terraform.tfvars`. After state is no longer needed, remove the bootstrap bucket with `gcloud storage rm -r gs://sky-tfstate-project-97e92755-cd8e-4b21-851`.

## Remaining manual actions

1. Complete ADC browser login in WSL.
2. Review and push the prepared repository changes to `main`; the private repo requires the read-only deploy-key bootstrap for Argo CD.
3. Run Terraform plan/apply, then publish the existing WeatherAPI key with `scripts/publish-weather-secret.sh`.
4. Run the image build/promotion workflow and `scripts/bootstrap-argocd.sh`.
5. Enter actual Cloud DNS nameservers at the registrar. Verify public DNS and TLS after propagation.
6. Set the listed GitHub variables from Terraform outputs; run workflows and record real statuses and the deployed digest here.
