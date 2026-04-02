#!/bin/sh
set -e

echo "▶ Running database migrations..."
# Resolve any migrations that were removed from the codebase after failing in production.
# These commands are idempotent: they succeed if the migration is stuck as failed, and
# exit non-zero (suppressed) if the migration record doesn't exist or is already resolved.
prisma migrate resolve --rolled-back 20260401_enable_rls_category --schema=./packages/db/prisma/schema.prisma 2>/dev/null || true
prisma migrate deploy --schema=./packages/db/prisma/schema.prisma

echo "▶ Starting server..."
exec node dist/server.js
