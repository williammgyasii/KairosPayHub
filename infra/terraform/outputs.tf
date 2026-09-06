output "zone_id" {
  description = "Cloudflare zone ID for kairospayhub.com"
  value       = data.cloudflare_zone.main.id
}

output "r2_managed" {
  description = "Whether Terraform is managing R2 buckets"
  value       = var.manage_r2
}

output "r2_bucket_prod" {
  value = var.manage_r2 ? cloudflare_r2_bucket.assets[0].name : var.r2_bucket_prod
}

output "r2_bucket_dev" {
  value = var.manage_r2 ? cloudflare_r2_bucket.assets_dev[0].name : var.r2_bucket_dev
}

output "app_urls" {
  description = "Canonical app URLs (gateway custom domains)"
  value = {
    development = "https://dev.app.kairospayhub.com"
    production  = "https://app.kairospayhub.com"
  }
}
