# ===========================================
# ManteMap — Dockerfile (Producción)
# ===========================================

FROM node:20-alpine AS base
RUN corepack enable

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY packages/validation/package.json ./packages/validation/
COPY packages/config/package.json ./packages/config/
RUN pnpm install --frozen-lockfile

# --- Build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules
COPY --from=deps /app/packages/validation/node_modules ./packages/validation/node_modules
COPY --from=deps /app/packages/config/node_modules ./packages/config/node_modules
COPY . .

# Generate Prisma client
RUN cd packages/database && npx prisma generate

# Build
RUN pnpm build

# --- Production ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy build artifacts
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

# Storage directory
RUN mkdir -p /app/storage && chown nextjs:nodejs /app/storage

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
