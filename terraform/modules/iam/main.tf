resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = "github-actions"
  display_name              = "GitHub Actions"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github"
  display_name                       = "GitHub Actions OIDC"
  attribute_mapping = {
    "google.subject"          = "assertion.sub"
    "attribute.repository"    = "assertion.repository"
    "attribute.repository_id" = "assertion.repository_id"
    "attribute.ref"           = "assertion.ref"
    "attribute.workflow_ref"  = "assertion.workflow_ref"
  }
  attribute_condition = "assertion.repository_id == '${var.github_repository_id}' && assertion.ref == 'refs/heads/${var.github_branch}'"
  oidc { issuer_uri = "https://token.actions.githubusercontent.com" }
}

resource "google_service_account" "github_terraform" {
  project      = var.project_id
  account_id   = "sky-github-terraform"
  display_name = "GitHub Actions Terraform"
}

resource "google_service_account" "github_image" {
  project      = var.project_id
  account_id   = "sky-github-image"
  display_name = "GitHub Actions image publisher"
}

resource "google_service_account" "github_audit" {
  project      = var.project_id
  account_id   = "sky-github-audit"
  display_name = "GitHub Actions GKE audit"
}

resource "google_service_account_iam_member" "github_terraform_federation" {
  service_account_id = google_service_account.github_terraform.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.workflow_ref/${var.github_owner}/${var.github_repository}/.github/workflows/terraform-deploy.yml@refs/heads/${var.github_branch}"
}

resource "google_service_account_iam_member" "github_image_federation" {
  service_account_id = google_service_account.github_image.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.workflow_ref/${var.github_owner}/${var.github_repository}/.github/workflows/image-build.yml@refs/heads/${var.github_branch}"
}

resource "google_service_account_iam_member" "github_audit_federation" {
  service_account_id = google_service_account.github_audit.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.workflow_ref/${var.github_owner}/${var.github_repository}/.github/workflows/cluster-audit.yml@refs/heads/${var.github_branch}"
}

resource "google_project_iam_member" "github_image_artifact_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.github_image.email}"
}

resource "google_project_iam_member" "github_audit_cluster_admin" {
  project = var.project_id
  role    = "roles/container.admin"
  member  = "serviceAccount:${google_service_account.github_audit.email}"
}

resource "google_project_iam_member" "github_terraform_roles" {
  for_each = toset([
    "roles/artifactregistry.admin",
    "roles/compute.networkAdmin",
    "roles/container.admin",
    "roles/dns.admin",
    "roles/iam.serviceAccountAdmin",
    "roles/iam.serviceAccountUser",
    "roles/iam.workloadIdentityPoolAdmin",
    "roles/resourcemanager.projectIamAdmin",
    "roles/secretmanager.admin",
    "roles/serviceusage.serviceUsageAdmin",
    "roles/storage.admin",
  ])
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.github_terraform.email}"
}
