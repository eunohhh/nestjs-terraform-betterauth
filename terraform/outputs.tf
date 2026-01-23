output "ecs_service_name" {
  description = "ECS service name"
  value       = module.ecs.service_name
}

output "route53_name_servers" {
  description = "Route53 name servers - Set these in GoDaddy"
  value       = aws_route53_zone.main.name_servers
}

output "acm_certificate_arn" {
  description = "ACM certificate ARN"
  value       = module.acm.certificate_arn
}
