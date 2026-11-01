variable "project_id" { type = string }
variable "region" { type = string }
variable "zone" { type = string }

variable "environment" {
  type    = string
  default = "prod"
}

variable "github_owner" { type = string }
variable "github_repository" { type = string }
variable "github_repository_id" { type = string }

variable "github_branch" {
  type    = string
  default = "main"
}

variable "domain" {
  type    = string
  default = "depl0y.site"
}

variable "weather_secret_name" {
  type    = string
  default = "sky-weather-api-key"
}

variable "equity_secret_name" {
  type    = string
  default = "equity-alpha-vantage-api-key"
}

variable "cluster_name" {
  type    = string
  default = "sky-prod"
}

variable "node_machine_type" {
  type    = string
  default = "e2-standard-4"
}

variable "node_count" {
  type    = number
  default = 1
}

variable "terraform_state_bucket" { type = string }
