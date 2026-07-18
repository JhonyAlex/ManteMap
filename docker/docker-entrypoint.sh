#!/bin/sh
set -e

# Run Prisma migrations
echo "Running prisma migrate deploy..."
prisma migrate deploy --schema=/app/packages/database/prisma/schema.prisma

echo "Starting Next.js..."
exec node /app/apps/web/server.js
