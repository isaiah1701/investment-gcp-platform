resource "google_secret_manager_secret" "weather_api_key" {
  project   = var.project_id
  secret_id = var.secret_name
  replication {
    auto {}
  }
  labels = { application = "sky", purpose = "weather-api-key" }
  lifecycle { prevent_destroy = true }
}
