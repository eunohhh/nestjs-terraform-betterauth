#!/usr/bin/env bash
set -euo pipefail

# Manual deploy to single EC2 via SSM Run Command.
#
# Prereqs:
# - AWS CLI configured locally (AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY or profile)
# - docker buildx available locally
# - EC2 is SSM-managed and has docker + docker compose installed
# - /opt/allrecords on EC2 contains compose.yml + app.env
#
# Required env:
#   EC2_INSTANCE_ID=...   (terraform output ec2_instance_id)
# Optional env:
#   AWS_REGION=ap-northeast-2
#   APP_NAME=eunsun-family-backend
#   ECR_REPOSITORY_URL=... (terraform output ecr_repository_url)
#   IMAGE_TAG=<git-sha> (defaults to current git sha)
#

AWS_REGION=${AWS_REGION:-ap-northeast-2}
APP_NAME=${APP_NAME:-eunsun-family-backend}

if [[ -z "${EC2_INSTANCE_ID:-}" ]]; then
  echo "ERROR: EC2_INSTANCE_ID is required" >&2
  exit 1
fi

if [[ -z "${ECR_REPOSITORY_URL:-}" ]]; then
  echo "ERROR: ECR_REPOSITORY_URL is required (e.g. terraform output ecr_repository_url)" >&2
  exit 1
fi

IMAGE_TAG=${IMAGE_TAG:-$(git rev-parse HEAD 2>/dev/null || true)}
if [[ -z "$IMAGE_TAG" ]]; then
  echo "ERROR: IMAGE_TAG is empty and git sha could not be detected" >&2
  exit 1
fi

ECR_REGISTRY="${ECR_REPOSITORY_URL%%/*}"

echo "Deploying $APP_NAME"
echo "  region:   $AWS_REGION"
echo "  instance: $EC2_INSTANCE_ID"
echo "  image:    $ECR_REPOSITORY_URL:$IMAGE_TAG"

# 1) Build + push image (arm64 for t4g)
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"

BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

docker buildx build \
  --platform linux/arm64 \
  --build-arg BUILD_DATE="$BUILD_DATE" \
  --build-arg GIT_COMMIT="$GIT_COMMIT" \
  -t "$ECR_REPOSITORY_URL:$IMAGE_TAG" \
  --push \
  .

# 2) Run deploy on EC2 via SSM
read -r -d '' REMOTE_SCRIPT <<EOF || true
set -euo pipefail
cd /opt/allrecords

if [ ! -f compose.yml ]; then
  echo "ERROR: /opt/allrecords/compose.yml not found" >&2
  exit 1
fi

if [ ! -f app.env ]; then
  echo "ERROR: /opt/allrecords/app.env not found (create with DB/Neo4j/etc env vars)" >&2
  exit 1
fi

# deploy.env is deploy-controlled
{
  echo "ECR_REPOSITORY_URL=${ECR_REPOSITORY_URL}"
  echo "IMAGE_TAG=${IMAGE_TAG}"
} > deploy.env

# .env is for docker compose interpolation only
{
  echo "ECR_REPOSITORY_URL=${ECR_REPOSITORY_URL}"
  echo "IMAGE_TAG=${IMAGE_TAG}"
} > .env

aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

docker compose -f compose.yml pull

docker compose -f compose.yml up -d

echo "OK: deployed ${ECR_REPOSITORY_URL}:${IMAGE_TAG}"
EOF

# Convert to JSON array of lines for SSM
CMDS_JSON=$(printf '%s\n' "$REMOTE_SCRIPT" | jq -R -s -c 'split("\n")[:-1]')

RESP=$(aws ssm send-command \
  --region "$AWS_REGION" \
  --instance-ids "$EC2_INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --comment "Manual deploy: $APP_NAME $IMAGE_TAG" \
  --parameters "commands=$CMDS_JSON" \
  --output json)

COMMAND_ID=$(echo "$RESP" | jq -r '.Command.CommandId')
echo "SSM CommandId: $COMMAND_ID"

aws ssm wait command-executed \
  --region "$AWS_REGION" \
  --command-id "$COMMAND_ID" \
  --instance-id "$EC2_INSTANCE_ID"

aws ssm get-command-invocation \
  --region "$AWS_REGION" \
  --command-id "$COMMAND_ID" \
  --instance-id "$EC2_INSTANCE_ID" \
  --query '{Status:Status, StandardOutputContent:StandardOutputContent, StandardErrorContent:StandardErrorContent}' \
  --output json | jq .
