resource "aws_route53_record" "app" {
  zone_id         = var.hosted_zone_id
  name            = local.app_domain
  type            = "A"
  allow_overwrite = true

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "api" {
  zone_id         = var.hosted_zone_id
  name            = local.api_domain
  type            = "A"
  allow_overwrite = true

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
