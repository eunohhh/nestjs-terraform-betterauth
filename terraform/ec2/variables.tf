variable "app_name" {
  type        = string
  description = "Application name"
}

variable "environment" {
  type        = string
  description = "Environment name"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID"
}

variable "public_subnet_id" {
  type        = string
  description = "Public subnet ID to place the instance in"
}

variable "instance_type" {
  type        = string
  description = "EC2 instance type"
  default     = "t4g.small"
}

variable "ssh_key_name" {
  type        = string
  description = "Existing EC2 key pair name for SSH access"
}

variable "ssh_ingress_cidrs" {
  type        = list(string)
  description = "CIDR blocks allowed to SSH into the instance"
  default     = ["0.0.0.0/0"]
}
