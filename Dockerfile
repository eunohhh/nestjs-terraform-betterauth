# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY backend/package.json backend/pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY backend/ .

# Generate Prisma client & build
# Use dummy DATABASE_URL for prisma generate (only needs valid format, not actual connection)
ENV DATABASE_URL="postgresql://user:password@localhost:5432/dummy?schema=public"
RUN pnpm build && \
    ls -la dist/src/ && \
    test -f dist/src/main.js || (echo "ERROR: dist/src/main.js not found!" && exit 1)

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy package files
COPY backend/package.json backend/pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/generated ./src/generated

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
