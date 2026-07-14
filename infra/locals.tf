locals {
  # apex (kairospayhub.com) is reserved for the marketing site, managed elsewhere.
  app_domain = "app.${var.domain_name}" # frontend SPA (CloudFront)
  api_domain = "api.${var.domain_name}" # backend API (ALB)
}
