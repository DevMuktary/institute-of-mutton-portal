# Multi-stage production Dockerfile for Next.js with Prisma & Standalone Output
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Step 1: Dependencies installation
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# Step 2: Build the application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set dummy build-time environment variables for Next.js compilation
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mutoon"
ENV JWT_SECRET="build-time-secret-key-for-standalone-compilation"

# Generate Prisma Client and create standalone production bundle
RUN npx prisma generate
RUN npm run build

# Step 3: Production runner (Minimal footprint, non-root user)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create unprivileged system user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy static assets and public directory
COPY --from=builder /app/public ./public

# Copy Prisma schema and migrations if needed at runtime
COPY --from=builder /app/prisma ./prisma

# Copy standalone build output and static chunks
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
