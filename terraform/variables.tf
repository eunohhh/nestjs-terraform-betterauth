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
