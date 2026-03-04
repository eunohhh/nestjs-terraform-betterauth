# EC2 deployment (Docker Compose + host Nginx + Let's Encrypt)

This folder contains templates for running the backend on a single EC2 instance.

Recommended setup:
- Backend runs as a Docker container on `127.0.0.1:3000`
- Host Nginx (systemd service) terminates HTTP/HTTPS on ports 80/443
- Let's Encrypt is managed by `certbot --nginx`

## Layout on the EC2 instance

Recommended path:

- `/opt/allrecords/compose.yml`
- `/opt/allrecords/app.env` (application env; NOT committed)
- `/opt/allrecords/deploy.env` (deploy-controlled vars: IMAGE_TAG, ECR_REPOSITORY_URL)

Host Nginx config lives under `/etc/nginx/` (not in this repo).
Certs live under `/etc/letsencrypt/`.

## Quickstart (manual)

```bash
sudo mkdir -p /opt/allrecords
sudo chown -R ec2-user:ec2-user /opt/allrecords

# copy compose
cp deploy/ec2/compose.yml /opt/allrecords/compose.yml

# create env files
touch /opt/allrecords/app.env
touch /opt/allrecords/deploy.env

# example deploy.env (usually written by GitHub Actions)
# ECR_REPOSITORY_URL=...dkr.ecr.ap-northeast-2.amazonaws.com/eunsun-family-backend
# IMAGE_TAG=<git-sha>

cd /opt/allrecords
docker compose up -d
```

## Host Nginx + Let's Encrypt

1) Install Nginx + Certbot

```bash
sudo dnf install -y nginx certbot python3-certbot-nginx
sudo systemctl enable --now nginx
```

2) Create an Nginx vhost for your domain that proxies to `http://127.0.0.1:3000`.

3) Issue/renew certs:

```bash
sudo certbot --nginx -d <domain>
sudo certbot renew --dry-run
```
