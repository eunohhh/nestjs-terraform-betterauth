# Migration plan: ALB/ECS(Fargate) -> single EC2

This repo currently deploys the backend via ECS(Fargate) behind an internet-facing ALB.

Goal: reduce fixed costs by moving to a single EC2 instance running Docker Compose + Nginx + Let's Encrypt.

## Phases (recommended)

1) **Disable Container Insights** (reduce CloudWatch MetricMonitorUsage)
2) **Provision EC2 + EIP** in parallel (keep ALB/ECS running)
3) Add **canary domain** -> EC2, issue LE cert, validate runtime
4) Switch **api.allrecords.me** A record -> EC2 EIP
5) After stable, remove **ALB/ACM/ECS**

## Notes

- Healthcheck endpoint: `GET /` (see `backend/src/app.controller.ts`)
- Use git SHA image tags.
- Keep Route53 / Secrets Manager / S3.
