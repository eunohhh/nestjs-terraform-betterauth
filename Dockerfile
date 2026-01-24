# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy backend package.json
COPY backend/package.json ./backend/

# Install dependencies (workspace aware)
RUN pnpm install --frozen-lockfile --filter backend

# Copy backend source code
COPY backend/ ./backend/

# Generate Prisma client & build
# Use dummy DATABASE_URL for prisma generate (only needs valid format, not actual connection)
WORKDIR /app/backend
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

# Copy workspace root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy backend package.json
COPY backend/package.json ./backend/

# Install production dependencies only (workspace aware)
RUN pnpm install --frozen-lockfile --prod --filter backend

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
