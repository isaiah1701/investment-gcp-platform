resource "google_artifact_registry_repository" "sky" {
  project       = var.project_id
  location      = var.region
  repository_id = "sky"
  description   = "Immutable Sky application images"
  format        = "DOCKER"
  docker_config { immutable_tags = true }
  cleanup_policies {
    id     = "keep-recent"
    action = "KEEP"
    most_recent_versions { keep_count = 20 }
  }
}
