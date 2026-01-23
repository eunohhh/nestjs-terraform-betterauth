output "cluster_id" {
  description = "ECS cluster ID"
  value       = aws_ecs_cluster.main.id
}

output "cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "service_name" {
  description = "ECS service name"
  value       = aws_ecs_service.app.name
}

output "task_definition_arn" {
  description = "Task definition ARN"
  value       = aws_ecs_task_definition.app.arn
}

output "execution_role_arn" {
  description = "Execution role ARN"
  value       = aws_iam_role.execution.arn
}

output "task_role_arn" {
  description = "Task role ARN"
  value       = aws_iam_role.task.arn
}
