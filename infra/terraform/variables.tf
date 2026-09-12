variable "cloudflare_account_id" {
  type        = string
  description = "Cloudflare account ID"
  default     = "e23518956f08ff35812d9ab001a39880"
}

variable "zone_name" {
  type        = string
  description = "Primary DNS zone"
  default     = "kairospayhub.com"
}

variable "manage_r2" {
  type        = bool
  description = "When true, manage R2 buckets in Terraform (requires Account R2 Edit on the API token + import of existing buckets)"
  default     = false
}

variable "manage_waf" {
  type        = bool
  description = "When true, enable Cloudflare Managed + OWASP WAF rulesets on the zone (requires Zone WAF Edit)"
  default     = false
}

variable "r2_bucket_prod" {
  type        = string
  description = "Production R2 bucket for church assets"
  default     = "kairospayhub-assets"
}

variable "r2_bucket_dev" {
  type        = string
  description = "Development R2 bucket for church assets"
  default     = "kairospayhub-assets-dev"
}
