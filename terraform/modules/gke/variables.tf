variable "name" { type = string }
variable "project_id" { type = string }
variable "location" { type = string }
variable "network" { type = string }
variable "subnetwork" { type = string }
variable "pod_range_name" { type = string }
variable "service_range_name" { type = string }
variable "machine_type" { type = string }
variable "node_count" { type = number }
variable "labels" {
  type    = map(string)
  default = {}
}
