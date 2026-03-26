#!/bin/sh
set -e

if [ -f /vault/config/internal.env ]; then
    echo "Loading credentials from Vault..."
    export $(grep -v '^#' /vault/config/internal.env | xargs)
fi

npx prisma generate

echo "Waiting for database and applying prisma schema..."

until npx prisma db push --accept-data-loss; do
  echo "prisma db push failed, retrying in 2s..."
  sleep 2
done

echo "Database ready. Starting app..."

exec npm run dev