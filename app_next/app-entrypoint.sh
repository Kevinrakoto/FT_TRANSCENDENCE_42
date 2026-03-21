#!/bin/sh
set -e

npx prisma generate

echo "Waiting for database and applying prisma schema..."

# retry prisma db push until it succeeds (DB may not be ready yet)
until npx prisma db push --accept-data-loss; do
  echo "prisma db push failed, retrying in 2s..."
  sleep 2
done

echo "Database ready. Starting app..."

exec npm run dev