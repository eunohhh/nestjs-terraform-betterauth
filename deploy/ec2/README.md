# EC2 deployment (Docker Compose + Nginx + Let's Encrypt)

This folder contains templates for running the backend on a single EC2 instance.

## Layout on the EC2 instance

Recommended path:

- `/opt/allrecords/compose.yml`
- `/opt/allrecords/.env` (NOT committed)
- `/opt/allrecords/nginx/conf.d/api.conf`
- `/opt/allrecords/letsencrypt/` (certs)

## Quickstart (manual)

```bash
sudo mkdir -p /opt/allrecords
sudo chown -R ec2-user:ec2-user /opt/allrecords

# copy compose + nginx config
cp deploy/ec2/compose.yml /opt/allrecords/compose.yml
mkdir -p /opt/allrecords/nginx/conf.d
cp deploy/ec2/nginx/conf.d/api.conf /opt/allrecords/nginx/conf.d/api.conf

# create /opt/allrecords/.env with required variables
# ECR_REPOSITORY_URL, IMAGE_TAG, DATABASE_URL, etc.

cd /opt/allrecords
docker compose up -d
```

## Let's Encrypt

Preferred approach: use `certbot --nginx -d <domain>` after DNS points to the instance.

You can also use webroot if you don't want certbot to edit configs.
