resource "aws_route53_record" "app" {
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"
  ttl     = var.ttl

  records = [var.ec2_public_ip]
}
