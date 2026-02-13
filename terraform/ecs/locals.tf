data "aws_secretsmanager_secret" "app" {
  name = "eunsun-family-backend-secrets-${var.environment}"
}

data "aws_secretsmanager_secret_version" "app" {
  secret_id = data.aws_secretsmanager_secret.app.id
}

locals {
  secret_name = "eunsun-family-backend-secrets-${var.environment}"
  secret_arn  = data.aws_secretsmanager_secret.app.arn


  container_environment = [
    {
      name  = "NODE_ENV"
      value = var.environment
    },
    {
      name  = "PORT"
      value = "3000"
    }
  ]

  # NOTE: Must be set as Secret Manager secrets
  container_secrets = [
    {
      name      = "BETTER_AUTH_SECRET"
      valueFrom = "${local.secret_arn}:BETTER_AUTH_SECRET::"
    },
    {
      name      = "BETTER_AUTH_URL"
      valueFrom = "${local.secret_arn}:BETTER_AUTH_URL::"
    },
    {
      name      = "APP_JWT_SECRET"
      valueFrom = "${local.secret_arn}:APP_JWT_SECRET::"
    },
    {
      name      = "DATABASE_URL"
      valueFrom = "${local.secret_arn}:DATABASE_URL::"
    },
    {
      name      = "GOOGLE_CLIENT_ID"
      valueFrom = "${local.secret_arn}:GOOGLE_CLIENT_ID::"
    },
    {
      name      = "GOOGLE_CLIENT_SECRET"
      valueFrom = "${local.secret_arn}:GOOGLE_CLIENT_SECRET::"
    },
    {
      name      = "FRONTEND_URL"
      valueFrom = "${local.secret_arn}:FRONTEND_URL::"
    },
    {
      name      = "APP_URL"
      valueFrom = "${local.secret_arn}:APP_URL::"
    },
    {
      name      = "ALLOWED_EMAILS"
      valueFrom = "${local.secret_arn}:ALLOWED_EMAILS::"
    },
    {
      name      = "APPLE_CLIENT_ID"
      valueFrom = "${local.secret_arn}:APPLE_CLIENT_ID::"
    },
    {
      name      = "APPLE_CLIENT_SECRET"
      valueFrom = "${local.secret_arn}:APPLE_CLIENT_SECRET::"
    },
    {
      name      = "APPLE_APP_BUNDLE_IDENTIFIER"
      valueFrom = "${local.secret_arn}:APPLE_APP_BUNDLE_IDENTIFIER::"
    },
    {
      name      = "ALLOW_REVIEW_LOGIN"
      valueFrom = "${local.secret_arn}:ALLOW_REVIEW_LOGIN::"
    },
    {
      name      = "NEO4J_URI"
      valueFrom = "${local.secret_arn}:NEO4J_URI::"
    },
    {
      name      = "NEO4J_USERNAME"
      valueFrom = "${local.secret_arn}:NEO4J_USERNAME::"
    },
    {
      name      = "NEO4J_PASSWORD"
      valueFrom = "${local.secret_arn}:NEO4J_PASSWORD::"
    },
    {
      name      = "NEO4J_DATABASE"
      valueFrom = "${local.secret_arn}:NEO4J_DATABASE::"
    },
    {
      name      = "AURA_INSTANCEID"
      valueFrom = "${local.secret_arn}:AURA_INSTANCEID::"
    },
    {
      name      = "AURA_INSTANCENAME"
      valueFrom = "${local.secret_arn}:AURA_INSTANCENAME::"
    },
  ]
}
