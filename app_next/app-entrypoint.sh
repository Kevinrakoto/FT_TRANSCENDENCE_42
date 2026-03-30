#!/bin/sh
set -e

echo "Waiting for Vault certificates..."
while [ ! -f /vault/certs/cert.pem ]; do
  sleep 2
done

echo "Installing Vault certificate..."
mkdir -p /usr/local/share/ca-certificates/vault

cp /vault/certs/cert.pem /usr/local/share/ca-certificates/vault/vault.crt
update-ca-certificates
echo "✅ Vault certificate installed."

echo "Waiting for Vault credentials (internal.env)..."
while [ ! -f /vault/config/internal.env ]; do
  sleep 2
done

echo "Loading credentials from Vault..."
export $(grep -v '^#' /vault/config/internal.env | xargs)

echo "Generating Prisma client..."
npx prisma generate

echo "Waiting for database and applying prisma schema..."
until npx prisma db push --accept-data-loss; do
  echo "Prisma db push failed (Postgres might not be ready), retrying in 2s..."
  sleep 2
done

echo "✅ Database ready and schema applied."

echo "Starting app in ${NODE_ENV:-development} mode..."

if [ "$NODE_ENV" = "production" ]; then
  exec npm run start
else
  exec npm run dev
fi