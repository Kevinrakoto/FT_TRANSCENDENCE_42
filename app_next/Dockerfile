# Production Dockerfile - Multi-stage build for ft_transcendence

# ============================================
# Stage 1: Build
# ============================================
FROM node:20-bullseye-slim AS builder

WORKDIR /app

# Copy dependency files first (layer caching)
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY next.config.js ./
COPY tsconfig.json ./
COPY postcss.config.mjs ./
COPY tailwind.config.mjs ./
COPY server.js ./
COPY tankServer.js ./
COPY public ./public/
COPY src ./src/

# Build Next.js for production
RUN npm run build

# ============================================
# Stage 2: Production Runtime
# ============================================
FROM node:20-bullseye-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libgbm1 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r app && useradd -r -g app app

WORKDIR /app

# Copy dependency files and install production-only deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy Prisma schema and generate client for production
COPY prisma ./prisma/
RUN npx prisma generate

# Copy production build from builder stage
COPY --from=builder /app/.next ./.next/

# Copy server files and scripts
COPY server.js ./
COPY tankServer.js ./
COPY app-entrypoint.sh /usr/local/bin/app-entrypoint.sh
RUN chmod +x /usr/local/bin/app-entrypoint.sh

# Copy public assets
COPY public ./public/

# Ensure certificates directory exists (volume will be mounted here)
RUN mkdir -p /app/certificates

# Set ownership
RUN chown -R app:app /app

USER app

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/app-entrypoint.sh"]
