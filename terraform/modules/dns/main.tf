resource "google_compute_global_address" "this" {
  for_each     = toset(["sky", "argocd", "grafana"])
  project      = var.project_id
  name         = "${var.name}-${each.key}-ip"
  address_type = "EXTERNAL"
  ip_version   = "IPV4"
}

resource "google_dns_managed_zone" "this" {
  project       = var.project_id
  name          = var.zone_name
  dns_name      = "${trimsuffix(var.domain, ".")}."
  description   = "Sky public DNS zone"
  visibility    = "public"
  force_destroy = false
}

locals {
  addresses = { for name, address in google_compute_global_address.this : name => address.address }
}

resource "google_dns_record_set" "app" {
  for_each     = local.addresses
  project      = var.project_id
  managed_zone = google_dns_managed_zone.this.name
  name         = "${each.key}.${trimsuffix(var.domain, ".")}."
  type         = "A"
  ttl          = 300
  rrdatas      = [each.value]
}

resource "google_dns_record_set" "apex" {
  project      = var.project_id
  managed_zone = google_dns_managed_zone.this.name
  name         = "${trimsuffix(var.domain, ".")}."
  type         = "A"
  ttl          = 300
  rrdatas      = [google_compute_global_address.this["sky"].address]
}
