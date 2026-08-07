variable "aws_region" {
  description = "AWS region for Cognito."
  type        = string
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "Local AWS CLI profile used by Terraform."
  type        = string
  default     = "ceyc"
}

variable "project" {
  description = "Project name, used as a prefix for resource names."
  type        = string
  default     = "kairospayhub"
}

variable "frontend_urls" {
  description = "Cognito SPA callback and logout URLs (Render app URL + local dev)."
  type        = list(string)
  default = [
    "http://localhost:5173",
    "https://app.kairospayhub.com",
  ]
}
