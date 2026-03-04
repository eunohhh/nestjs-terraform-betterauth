variable "route53_zone_id" {
  description = "Route53 hosted zone ID"
  type        = string
}

variable "domain_name" {
  description = "Record name (e.g. api.allrecords.me)"
  type        = string
}

variable "ec2_public_ip" {
  description = "Public IPv4 (Elastic IP) of the EC2 instance"
  type        = string
}

variable "ttl" {
  description = "TTL for the A record"
  type        = number
  default     = 60
}
