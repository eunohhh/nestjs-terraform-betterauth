# Manual deploy to EC2 (SSM)

This repo now runs on a single EC2 instance. Deploys are done manually from your local machine.

## Prereqs

- AWS CLI configured locally
- Docker + buildx locally
- EC2 is SSM-managed and has docker + docker compose
- On EC2: `/opt/allrecords/compose.yml`, `/opt/allrecords/app.env` exist

## Get values

From terraform:

```bash
cd terraform
terraform output -raw ecr_repository_url
terraform output -raw ec2_instance_id
```

## Run deploy

```bash
export AWS_REGION=ap-northeast-2
export ECR_REPOSITORY_URL="$(cd terraform && terraform output -raw ecr_repository_url)"
export EC2_INSTANCE_ID="$(cd terraform && terraform output -raw ec2_instance_id)"

# optional: export IMAGE_TAG=<git-sha>

./scripts/deploy-ec2.sh
```
