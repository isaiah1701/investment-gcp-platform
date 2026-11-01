#!/usr/bin/env bash
set -euo pipefail
PROJECT_ID="${PROJECT_ID:-project-97e92755-cd8e-4b21-851}"
CLUSTER_NAME="${CLUSTER_NAME:-sky-prod}"
ZONE="${ZONE:-europe-west2-a}"
ARGO_VERSION="10.11.6"
REPO_SSH_URL="git@github.com:isaiah1701/wealth-os-gke-platform.git"
KEY_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/equity-gitops"
KEY_FILE="$KEY_DIR/argocd-deploy-key"

command -v gcloud >/dev/null
command -v kubectl >/dev/null
command -v helm >/dev/null
command -v gh >/dev/null
gcloud container clusters get-credentials "$CLUSTER_NAME" --project "$PROJECT_ID" --zone "$ZONE"
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -

helm repo add argo https://argoproj.github.io/argo-helm >/dev/null
helm repo update argo >/dev/null
helm upgrade --install argocd argo/argo-cd --namespace argocd --version "$ARGO_VERSION" --values gitops/values/argocd-values.yaml --wait --timeout 15m
kubectl rollout status -n argocd deployment/argocd-server --timeout=10m

if ! kubectl -n monitoring get secret sky-grafana-admin >/dev/null 2>&1; then
  TMP_DIR="$(mktemp -d)"
  trap 'rm -rf "$TMP_DIR"' EXIT
  umask 077
  printf 'admin' > "$TMP_DIR/admin-user"
  openssl rand -hex 32 > "$TMP_DIR/admin-password"
  kubectl -n monitoring create secret generic sky-grafana-admin --from-file=admin-user="$TMP_DIR/admin-user" --from-file=admin-password="$TMP_DIR/admin-password"
  rm -rf "$TMP_DIR"
  trap - EXIT
fi

mkdir -p "$KEY_DIR"
chmod 700 "$KEY_DIR"
if [[ ! -f "$KEY_FILE" ]]; then
  if gh repo deploy-key list --repo isaiah1701/wealth-os-gke-platform --json title --jq '.[].title' | grep -Fxq "Sky Argo CD read-only"; then
    echo "A Sky Argo CD deploy key already exists but the local private key is missing. Restore it securely before bootstrap." >&2
    exit 1
  fi
  ssh-keygen -q -t ed25519 -N '' -C "sky-argocd-readonly" -f "$KEY_FILE"
  chmod 600 "$KEY_FILE"
  gh repo deploy-key add "$KEY_FILE.pub" --repo isaiah1701/wealth-os-gke-platform --title "Sky Argo CD read-only"
fi

kubectl create secret generic sky-source-repository -n argocd \
  --from-file=sshPrivateKey="$KEY_FILE" \
  --from-literal=url="$REPO_SSH_URL" \
  --from-literal=type=git \
  --dry-run=client -o yaml \
  | kubectl label --local -f - argocd.argoproj.io/secret-type=repository -o yaml \
  | kubectl apply -f -

kubectl apply -f gitops/root-app.yaml
kubectl wait -n argocd --for=jsonpath='{.status.sync.status}=Synced' application/app-root --timeout=10m
kubectl get applications -n argocd
echo "Argo CD bootstrap completed. The repository key is read-only and stored outside Git."
