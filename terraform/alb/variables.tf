variable "app_name" {
  description = "Application name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs"
  type        = list(string)
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN"
  type        = string
}

variable "container_port" {
  description = "Container port"
  type        = number
  default     = 3000
}
