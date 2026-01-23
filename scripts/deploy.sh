#!/bin/bash
set -e

APP_NAME="eunsun-family-backend"
AWS_REGION=${AWS_REGION:-ap-northeast-2}
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}
ECR_REPOSITORY="$APP_NAME"
ECR_URL="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY"
TIMESTAMP=$(date -u +%Y%m%d-%H%M%S)
VERSION=${1:-$TIMESTAMP}

aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"


# latest / timestamp tag 각각 push
docker tag "$APP_NAME:latest" "$ECR_URL:$VERSION"
docker tag "$APP_NAME:latest" "$ECR_URL:latest"

docker push "$ECR_URL:$VERSION"
docker push "$ECR_URL:latest"

aws ecs update-service \
  --cluster "${APP_NAME}" \
  --service "${APP_NAME}" \
  --force-new-deployment \
  --region "$AWS_REGION"

echo "Deployed image: $ECR_URL:$VERSION"