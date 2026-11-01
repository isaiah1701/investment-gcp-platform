output "secret_name" { value = google_secret_manager_secret.weather_api_key.secret_id }
output "secret_resource_id" { value = google_secret_manager_secret.weather_api_key.id }
