variable "aws_region" {
  description = "AWS region for all resources (must be us-east-1 for the CloudFront ACM cert)."
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

variable "domain_name" {
  description = "Root domain served by CloudFront."
  type        = string
  default     = "kairospayhub.com"
}

variable "hosted_zone_id" {
  description = "Route 53 hosted zone id for domain_name."
  type        = string
  default     = "Z0549161344J6QL54UN3A"
}

variable "container_port" {
  description = "Port the ASP.NET container listens on."
  type        = number
  default     = 8080
}

variable "desired_count" {
  description = "Number of Fargate tasks to run."
  type        = number
  default     = 1
}

variable "db_instance_class" {
  description = "RDS instance class (db.t4g.micro is free-tier eligible)."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_name" {
  description = "Postgres database name."
  type        = string
  default     = "kairospayhub"
}

variable "db_username" {
  description = "Postgres master username."
  type        = string
  default     = "kairos"
}

variable "github_owner" {
  description = "GitHub org/user that owns the repo (for OIDC trust)."
  type        = string
  default     = "williammgyasii"
}

variable "github_repo" {
  description = "GitHub repository name (for OIDC trust)."
  type        = string
  default     = "KairosPayHub"
}
