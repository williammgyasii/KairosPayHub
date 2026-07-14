output "cognito_user_pool_id" {
  description = "Cognito User Pool id."
  value       = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  description = "Cognito SPA app client id."
  value       = aws_cognito_user_pool_client.spa.id
}

output "cognito_hosted_ui_domain" {
  description = "Cognito Hosted UI domain (prefix)."
  value       = "${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
}

output "cognito_issuer_url" {
  description = "OIDC issuer URL for the user pool."
  value       = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
}

output "ecr_repository_url" {
  description = "ECR repo to push the API image to."
  value       = aws_ecr_repository.api.repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name."
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "ECS service name (for force-new-deployment)."
  value       = aws_ecs_service.api.name
}

output "alb_dns_name" {
  description = "Public DNS of the ALB (CloudFront origin)."
  value       = aws_lb.main.dns_name
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain."
  value       = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution id (for cache invalidation)."
  value       = aws_cloudfront_distribution.main.id
}

output "rds_endpoint" {
  description = "RDS instance endpoint."
  value       = aws_db_instance.main.address
}

output "frontend_bucket" {
  description = "S3 bucket hosting the SPA."
  value       = aws_s3_bucket.frontend.id
}

output "app_url" {
  description = "Frontend URL (CloudFront)."
  value       = "https://${local.app_domain}"
}

output "api_url" {
  description = "Backend API URL (ALB)."
  value       = "https://${local.api_domain}"
}

output "github_deploy_role_arn" {
  description = "IAM role ARN GitHub Actions assumes via OIDC."
  value       = aws_iam_role.github_deploy.arn
}
