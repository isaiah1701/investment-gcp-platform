#!/usr/bin/env bash
set -euo pipefail
PROJECT_ID="project-97e92755-cd8e-4b21-851"
STATE_BUCKET="sky-tfstate-${PROJECT_ID}"
REPO="isaiah1701/wealth-os-gke-platform"
TF_DIR="terraform/environments/prod"

terraform -chdir="$TF_DIR" output >/dev/null
set_variable() { gh variable set "$1" --body "$2" --repo "$REPO"; }
set_variable GCP_WIF_PROVIDER "$(terraform -chdir="$TF_DIR" output -raw github_workload_identity_provider)"
set_variable GCP_TERRAFORM_SERVICE_ACCOUNT "$(terraform -chdir="$TF_DIR" output -raw github_terraform_service_account_email)"
set_variable GCP_IMAGE_SERVICE_ACCOUNT "$(terraform -chdir="$TF_DIR" output -raw github_image_service_account_email)"
set_variable GCP_AUDIT_SERVICE_ACCOUNT "$(terraform -chdir="$TF_DIR" output -raw github_audit_service_account_email)"
set_variable GCP_PROJECT_ID "$PROJECT_ID"
set_variable TF_STATE_BUCKET "$STATE_BUCKET"
echo "GitHub Actions variables configured for ${REPO}."
