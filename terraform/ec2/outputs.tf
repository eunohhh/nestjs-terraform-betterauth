output "instance_id" {
  value       = aws_instance.app.id
  description = "EC2 instance id"
}

output "public_ip" {
  value       = aws_eip.app.public_ip
  description = "Elastic IP attached to the instance"
}

output "security_group_id" {
  value       = aws_security_group.ec2.id
  description = "Security group id for the instance"
}
