# Opt-in: set manage_r2=true after the Cloudflare API token has Account R2 Storage Edit,
# then import existing buckets (see README) before apply.
resource "cloudflare_r2_bucket" "assets" {
  count = var.manage_r2 ? 1 : 0

  account_id = var.cloudflare_account_id
  name       = var.r2_bucket_prod
}

resource "cloudflare_r2_bucket" "assets_dev" {
  count = var.manage_r2 ? 1 : 0

  account_id = var.cloudflare_account_id
  name       = var.r2_bucket_dev
}
