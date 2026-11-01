resource "google_container_cluster" "this" {
  name                        = var.name
  project                     = var.project_id
  location                    = var.location
  network                     = var.network
  subnetwork                  = var.subnetwork
  deletion_protection         = true
  remove_default_node_pool    = true
  initial_node_count          = 1
  networking_mode             = "VPC_NATIVE"
  enable_shielded_nodes       = true
  enable_intranode_visibility = false
  release_channel { channel = "REGULAR" }
  workload_identity_config { workload_pool = "${var.project_id}.svc.id.goog" }
  ip_allocation_policy {
    cluster_secondary_range_name  = var.pod_range_name
    services_secondary_range_name = var.service_range_name
  }
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
    master_global_access_config { enabled = false }
  }
  secret_manager_config { enabled = true }
  addons_config {
    http_load_balancing { disabled = false }
    horizontal_pod_autoscaling { disabled = false }
    gcp_filestore_csi_driver_config { enabled = false }
  }
  monitoring_config {
    managed_prometheus { enabled = false }
    enable_components = ["SYSTEM_COMPONENTS"]
  }
  logging_config { enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"] }
  resource_labels = var.labels
  lifecycle { ignore_changes = [node_pool, initial_node_count] }
}

resource "google_container_node_pool" "primary" {
  name       = "${var.name}-nodes"
  project    = var.project_id
  location   = var.location
  cluster    = google_container_cluster.this.name
  node_count = var.node_count
  node_config {
    machine_type    = var.machine_type
    disk_type       = "pd-balanced"
    disk_size_gb    = 50
    image_type      = "COS_CONTAINERD"
    service_account = google_service_account.nodes.email
    oauth_scopes    = ["https://www.googleapis.com/auth/cloud-platform"]
    workload_metadata_config { mode = "GKE_METADATA" }
    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }
    labels = var.labels
  }
  management {
    auto_repair  = true
    auto_upgrade = true
  }
  upgrade_settings {
    strategy        = "SURGE"
    max_surge       = 1
    max_unavailable = 0
  }
}

resource "google_service_account" "nodes" {
  project      = var.project_id
  account_id   = "${var.name}-nodes"
  display_name = "${var.name} GKE node identity"
}

resource "google_project_iam_member" "node_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.nodes.email}"
}

resource "google_project_iam_member" "node_monitoring" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.nodes.email}"
}

resource "google_project_iam_member" "node_artifact_reader" {
  project = var.project_id
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.nodes.email}"
}
