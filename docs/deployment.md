# Equity deployment preparation

## Current state

Equity has been implemented and the local Helm/GitOps/CI configuration is prepared, but it has **not** been built or deployed to GKE. The live cluster still runs the previous Sky application. This task did not push to GitHub, create/push an image, sync Argo CD, mutate Secret Manager, or run Terraform.

The Helm chart reuses the current `sky` namespace, service/ingress object names, service account, reserved external IP, and DNS names. Terraform does not need to change. The existing `sky-weather-api-key` must not be reused for Alpha Vantage.

## Production secret

The `equity-alpha-vantage-api-key` secret exists in project `project-97e92755-cd8e-4b21-851`. Its value was read from the ignored repository-root `.env` without printing it, then stored as Secret Manager version 1. The existing `sky` Kubernetes service account has `roles/secretmanager.secretAccessor` on this secret only. The GKE Secret Manager CSI volume exposes it at `/var/run/secrets/equity/investment-api-key`; the backend reads it through `INVESTMENT_API_KEY_FILE`. The key value is not stored in Terraform, Helm, GitOps, CI, or the image.

For a future key rotation, add a new version without putting the value in shell history or command arguments: use a private temporary file and a hidden terminal prompt with `gcloud secrets versions add equity-alpha-vantage-api-key --project=project-97e92755-cd8e-4b21-851 --data-file=PATH`.

## Build and release path

The existing GitHub Actions path is configured for `my-apps/investments-app/`: CI runs tests, lint, typechecking and build; the image workflow builds from the repository-root Dockerfile, scans the image, pushes to the existing Artifact Registry repository, then promotes its immutable digest into `gitops/values/app-values.yaml`. Argo CD reads `helm/equity` and the same values file.

Before a later release, review the Argo migration: the root app replaces the `sky` Argo Application with `equity`, while the chart preserves the Kubernetes resource names and public ingress IP. Reconcile that ownership transition deliberately, then verify certificate status, `/healthz`, `/readyz`, `/metrics`, stock search, quote and history. The managed certificate for `depl0y.site` already exists and is active from the earlier domain setup.

Do not run `terraform apply` for this application change; Terraform was not modified. Do not sync the Equity GitOps app until the rotated secret and image digest are ready.

## Existing platform access

The production cluster can be inspected with:

```bash
gcloud config configurations activate sky-prod
gcloud container clusters get-credentials sky-prod \
  --project project-97e92755-cd8e-4b21-851 \
  --zone europe-west2-a
kubectl -n argocd get applications
kubectl -n monitoring port-forward svc/kube-prometheus-stack-prometheus 9090:9090
```

The current Grafana and Argo CD credentials remain in Kubernetes Secrets:

```bash
kubectl -n monitoring get secret sky-grafana-admin -o jsonpath='{.data.admin-password}' | base64 --decode; echo
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 --decode; echo
```
