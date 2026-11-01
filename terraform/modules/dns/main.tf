resource "google_compute_global_address" "this" {
  for_each = toset(["app", "argocd", "grafana"])
  project  = var.project_id
  # Preserve the already-reserved application IP while adopting the app key.
  name         = "${var.name}-${each.key == "app" ? "sky" : each.key}-ip"
  address_type = "EXTERNAL"
  ip_version   = "IPV4"
}

moved {
  from = google_compute_global_address.this["sky"]
  to   = google_compute_global_address.this["app"]
}

resource "google_dns_managed_zone" "this" {
  project       = var.project_id
  name          = var.zone_name
  dns_name      = "${trimsuffix(var.domain, ".")}."
  description   = "Public application DNS zone"
  visibility    = "public"
  force_destroy = false
}

locals {
  addresses = { for name, address in google_compute_global_address.this : name => address.address }
}

resource "google_dns_record_set" "app" {
  for_each     = { for name, address in local.addresses : name => address if name != "app" }
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
  rrdatas      = [google_compute_global_address.this["app"].address]
}
