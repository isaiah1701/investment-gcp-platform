# Troubleshooting

## Credentials

The gcloud account and Terraform ADC are separate. Check `gcloud auth print-access-token` and `gcloud auth application-default print-access-token`. If ADC is missing, run `gcloud auth application-default login` and finish the browser sign-in.

## Workloads

Connect with `gcloud container clusters get-credentials sky-prod --project project-97e92755-cd8e-4b21-851 --zone europe-west2-a`. Inspect `kubectl get pods -A`, `kubectl -n sky describe pod -l app.kubernetes.io/name=sky`, `kubectl -n sky logs deploy/sky --tail=100` and `kubectl -n argocd get applications`.

For WeatherAPI errors, confirm Secret Manager has an enabled version and the pod mounts `/var/run/secrets/sky/weather-api-key`. Never put the key in logs, Terraform variables or Helm values.

## Ingress and TLS

Inspect `kubectl get managedcertificate -A` and `kubectl get ingress -A`, then check `dig NS depl0y.site` and `dig A sky.depl0y.site`. Certificates stay provisioning until public delegation points to the reserved IPs. Check Ingress events and `kubectl describe managedcertificate` for issues.

## Rollback

Revert the Git commit or PR updating `gitops/values/app-values.yaml`; Argo CD restores the previous digest. Review any infrastructure rollback plan before applying it. Do not disable GKE deletion protection just to clear drift.
