output "network_name" { value = google_compute_network.this.name }
output "network_self_link" { value = google_compute_network.this.self_link }
output "subnetwork_name" { value = google_compute_subnetwork.this.name }
output "pod_range_name" { value = "${var.name}-pods" }
output "service_range_name" { value = "${var.name}-services" }
