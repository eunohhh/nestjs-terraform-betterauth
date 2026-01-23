#!/bin/bash
set -e

APP_NAME="eunsun-family-backend"
BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
VERSION=${1:-latest}

docker build \
  --platform linux/amd64 \
  --build-arg BUILD_DATE="$BUILD_DATE" \
  --build-arg GIT_COMMIT="$GIT_COMMIT" \
  -t "$APP_NAME:$VERSION" \
  -t "$APP_NAME:$GIT_COMMIT" \
  -t "$APP_NAME:latest" \
  -f Dockerfile \
  .

echo "Built image: $APP_NAME:$VERSION"
