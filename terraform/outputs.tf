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

output "ec2_public_ip" {
  description = "Elastic IP for the parallel EC2 stack (enable_ec2=true)"
  value       = var.enable_ec2 ? module.ec2[0].public_ip : null
}

output "ec2_instance_id" {
  description = "Instance id for the parallel EC2 stack (enable_ec2=true)"
  value       = var.enable_ec2 ? module.ec2[0].instance_id : null
}
