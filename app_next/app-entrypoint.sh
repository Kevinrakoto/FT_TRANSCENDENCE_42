#!/bin/sh
set -e

echo "Waiting for Vault credentials..."
while [ ! -f /vault/config/internal.env ]; do
  sleep 2
done
sleep 1
echo "Loading credentials from Vault..."
export $(grep -v '^#' /vault/config/internal.env | xargs)

npx prisma generate

echo "Waiting for database and applying prisma schema..."

until npx prisma db push --accept-data-loss; do
  echo "prisma db push failed, retrying in 2s..."
  sleep 2
done

echo "Database ready. Starting app..."

if [ "$NODE_ENV" = "production" ]; then
  exec npm run start
else
  exec npm run dev
fi
