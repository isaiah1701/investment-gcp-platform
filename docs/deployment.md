# Deployment runbook

## Prerequisites

1. Select gcloud configuration `sky-prod`; confirm project `project-97e92755-cd8e-4b21-851`.
2. Ensure `gcloud auth print-access-token` and `gcloud auth application-default print-access-token` both succeed. Terraform requires ADC; use `gcloud auth application-default login` and finish browser sign-in if missing.
3. Run `terraform/bootstrap/bootstrap.sh`; it enables APIs and creates the versioned remote-state bucket.
4. Copy `terraform/environments/prod/terraform.tfvars.example` to local `terraform.tfvars`, enter the actual state bucket, and keep the file untracked.
5. Review Terraform plan and apply the prod environment. GKE nodes, NAT, disks, load balancers and traffic have ongoing charges.
6. Run `scripts/publish-weather-secret.sh` after Terraform has created the Secret Manager secret. It reads the key from root `.env` without printing or storing it in Terraform.
7. Run the gated `Sky Image Build and Promotion` workflow. It tests, builds, scans, pushes, captures the digest and promotes it in Git.
8. Run `scripts/bootstrap-argocd.sh`. It installs pinned Argo CD, creates the local Grafana credential secret, registers a read-only GitHub deploy key and applies the root app.

## Terraform

Run `terraform -chdir=terraform/environments/prod init -backend-config=bucket=sky-tfstate-project-97e92755-cd8e-4b21-851 -backend-config=prefix=sky/prod`.

Then run `terraform -chdir=terraform/environments/prod plan -var-file=terraform.tfvars -out=approved.tfplan` and inspect it before `terraform -chdir=terraform/environments/prod apply approved.tfplan`.

## GKE access

Connect with `gcloud config configurations activate sky-prod` then `gcloud container clusters get-credentials sky-prod --project project-97e92755-cd8e-4b21-851 --zone europe-west2-a`. Check `kubectl get nodes` and `kubectl -n argocd get applications`.

Prometheus is private: `kubectl -n monitoring port-forward svc/kube-prometheus-stack-prometheus 9090:9090`.

Grafana password: `kubectl -n monitoring get secret sky-grafana-admin -o jsonpath='{.data.admin-password}' | base64 --decode; echo`.

Argo CD initial admin password: `kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 --decode; echo`. If rotated, reset it from a trusted local shell with `argocd admin reset-password --account admin`; avoid shell history.

## DNS and HTTPS

Terraform creates the zone and A records. Enter every nameserver printed by `terraform output -json dns_name_servers` at the registrar for `depl0y.site`. Verify delegation with `dig NS depl0y.site`. Google-managed certificates become active after DNS points at the reserved ingress IPs.
