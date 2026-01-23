resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${var.app_name}"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${var.app_name}-logs"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
