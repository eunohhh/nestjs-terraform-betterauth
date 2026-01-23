output "domain_name" {
  description = "Domain name"
  value       = aws_route53_record.app.name
}

output "fqdn" {
  description = "Fully qualified domain name"
  value       = aws_route53_record.app.fqdn
}
