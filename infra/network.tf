data "aws_caller_identity" "current" {}

# Use the account's default VPC + subnets to avoid NAT/subnet costs. Fargate
# tasks get a public IP for outbound (Cognito, ECR, Secrets); inbound is locked
# down by security groups so only the ALB can reach them.
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}
