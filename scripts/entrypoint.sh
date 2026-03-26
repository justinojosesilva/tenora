#!/bin/sh
set -e

echo "▶ Running database migrations..."
prisma migrate deploy --schema=./packages/db/prisma/schema.prisma

echo "▶ Starting server..."
exec node dist/server.js
