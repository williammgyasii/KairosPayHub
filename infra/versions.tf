terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  backend "s3" {
    bucket       = "kairospayhub-tfstate-720718980178"
    key          = "infra/terraform.tfstate"
    region       = "us-east-1"
    profile      = "ceyc"
    encrypt      = true
    use_lockfile = true
  }
}
