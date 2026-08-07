output "cognito_user_pool_id" {
  description = "Cognito User Pool id (set as Cognito__UserPoolId / VITE_COGNITO_USER_POOL_ID on Render)."
  value       = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  description = "Cognito SPA app client id (set as Cognito__ClientId / VITE_COGNITO_CLIENT_ID on Render)."
  value       = aws_cognito_user_pool_client.spa.id
}

output "cognito_hosted_ui_domain" {
  description = "Cognito Hosted UI domain (prefix)."
  value       = "${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
}

output "cognito_issuer_url" {
  description = "OIDC issuer URL for the user pool (set as Cognito__Authority on Render)."
  value       = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
}

output "app_url" {
  description = "Frontend URL on Render."
  value       = "https://app.kairospayhub.com"
}

output "api_url" {
  description = "Backend API URL on Render."
  value       = "https://api.kairospayhub.com"
}
