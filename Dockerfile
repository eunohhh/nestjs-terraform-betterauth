# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy entire workspace (needed for pnpm deploy)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/ ./backend/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client & build
WORKDIR /app/backend
ENV DATABASE_URL="postgresql://user:password@localhost:5432/dummy?schema=public"
RUN pnpm build && \
    ls -la dist/src/ && \
    test -f dist/src/main.js || (echo "ERROR: dist/src/main.js not found!" && exit 1)

# Deploy standalone package
WORKDIR /app
RUN pnpm --filter=backend --prod deploy --legacy /app/standalone

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy standalone deployment (includes node_modules)
COPY --from=builder /app/standalone ./

# Copy built application
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/src/generated ./src/generated

# Set ownership
RUN chown -R nestjs:nodejs /app

USER nestjs

# Build args for metadata
ARG BUILD_DATE
ARG GIT_COMMIT
ENV BUILD_DATE=$BUILD_DATE
ENV GIT_COMMIT=$GIT_COMMIT

EXPOSE 3000

CMD ["node", "dist/src/main.js"]
