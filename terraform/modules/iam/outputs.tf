output "github_terraform_service_account_email" { value = google_service_account.github_terraform.email }
output "github_image_service_account_email" { value = google_service_account.github_image.email }
output "github_audit_service_account_email" { value = google_service_account.github_audit.email }
output "github_provider_name" { value = google_iam_workload_identity_pool_provider.github.name }
