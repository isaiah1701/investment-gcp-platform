#!/usr/bin/env bash
set -euo pipefail
PROJECT_ID="${PROJECT_ID:-project-97e92755-cd8e-4b21-851}"
REGION="${REGION:-europe-west2}"
BUCKET="${TF_STATE_BUCKET:-sky-tfstate-${PROJECT_ID}}"

if ! command -v gcloud >/dev/null; then
  echo "Google Cloud CLI is required." >&2
  exit 1
fi

gcloud config set project "$PROJECT_ID" >/dev/null
gcloud services enable compute.googleapis.com container.googleapis.com iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com dns.googleapis.com storage.googleapis.com serviceusage.googleapis.com --project="$PROJECT_ID" --quiet

if ! gcloud storage buckets describe "gs://${BUCKET}" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud storage buckets create "gs://${BUCKET}" --project="$PROJECT_ID" --location="$REGION" --uniform-bucket-level-access --public-access-prevention --default-storage-class=STANDARD
fi
gcloud storage buckets update "gs://${BUCKET}" --versioning
gcloud storage buckets update "gs://${BUCKET}" --public-access-prevention

echo "Terraform state bucket ready: ${BUCKET}"
echo "terraform -chdir=terraform/environments/prod init -backend-config=bucket=${BUCKET} -backend-config=prefix=sky/prod"
