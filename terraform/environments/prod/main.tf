locals {
  name = "sky-${var.environment}"
  labels = {
    application = "sky"
    environment = var.environment
    managed_by  = "terraform"
  }
}

module "network" {
  source = "../../modules/network"
  name   = local.name
  region = var.region
  labels = local.labels
}

module "gke" {
  source             = "../../modules/gke"
  name               = var.cluster_name
  project_id         = var.project_id
  location           = var.zone
  network            = module.network.network_name
  subnetwork         = module.network.subnetwork_name
  pod_range_name     = module.network.pod_range_name
  service_range_name = module.network.service_range_name
  machine_type       = var.node_machine_type
  node_count         = var.node_count
  labels             = local.labels
  depends_on         = [module.iam]
}

module "iam" {
  source               = "../../modules/iam"
  project_id           = var.project_id
  project_number       = data.google_project.current.number
  github_owner         = var.github_owner
  github_repository    = var.github_repository
  github_repository_id = var.github_repository_id
  github_branch        = var.github_branch
  secret_name          = var.weather_secret_name
}

module "secrets" {
  source      = "../../modules/secrets"
  project_id  = var.project_id
  secret_name = var.weather_secret_name
}

module "artifact_registry" {
  source     = "../../modules/artifact-registry"
  project_id = var.project_id
  region     = var.region
}

module "dns" {
  source     = "../../modules/dns"
  project_id = var.project_id
  domain     = var.domain
  name       = "sky-ingress-ips"
  zone_name  = "sky-public"
}

data "google_project" "current" {}
