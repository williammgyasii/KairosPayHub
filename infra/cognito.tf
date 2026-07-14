resource "aws_cognito_user_pool" "main" {
  name = "${var.project}-users"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  # Pastors self-serve via Hosted UI; leaders are still created by AdminCreateUser.
  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = false
  }
}

resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.project}-auth"
  user_pool_id = aws_cognito_user_pool.main.id
}

resource "aws_cognito_user_pool_client" "spa" {
  name         = "${var.project}-spa"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = false

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
  supported_identity_providers         = ["COGNITO"]

  callback_urls = [
    "http://localhost:5173",
    "https://${local.app_domain}",
  ]
  logout_urls = [
    "http://localhost:5173",
    "https://${local.app_domain}",
  ]

  prevent_user_existence_errors = "ENABLED"

  explicit_auth_flows = [
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH",
  ]
}
