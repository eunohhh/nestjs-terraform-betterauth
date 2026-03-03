variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-2"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "eunsun-family-backend"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "service_name" {
  description = "Service name for cost tracking"
  type        = string
  default     = "root"
}

variable "domain_name" {
  description = "Domain name"
  type        = string
  default     = "allrecords.me"
}

variable "image_tag" {
  description = "Docker image tag"
  type        = string
  default     = "latest"
}

variable "enable_ec2" {
  description = "Enable provisioning a parallel EC2 + EIP stack (for ALB/ECS migration)"
  type        = bool
  default     = false
}

variable "ec2_ssh_key_name" {
  description = "Existing EC2 key pair name for SSH access (required when enable_ec2=true)"
  type        = string
  default     = ""
}

variable "ec2_ssh_ingress_cidrs" {
  description = "CIDR blocks allowed to SSH into the EC2 instance"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "ec2_instance_type" {
  description = "EC2 instance type for the new single-instance backend"
  type        = string
  default     = "t4g.small"
}
