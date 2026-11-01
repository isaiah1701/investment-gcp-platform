output "zone_name" { value = google_dns_managed_zone.this.name }
output "name_servers" { value = google_dns_managed_zone.this.name_servers }
output "app_ip" { value = local.addresses.app }
output "argocd_ip" { value = local.addresses.argocd }
output "grafana_ip" { value = local.addresses.grafana }
output "app_domain" { value = trimsuffix(var.domain, ".") }
output "argocd_domain" { value = "argocd.${trimsuffix(var.domain, ".")}" }
output "grafana_domain" { value = "grafana.${trimsuffix(var.domain, ".")}" }
