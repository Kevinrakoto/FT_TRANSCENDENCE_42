#!/bin/bash
set -e

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${YELLOW}[POSTGRES] wait config Vault...${NC}"

while [ ! -f /vault/config/internal.env ]; do
  sleep 2
done
sleep 1

export $(grep -v '^#' /vault/config/internal.env | xargs)

echo -e "${GREEN}[POSTGRES] config OK ! Data base launch...${NC}"

exec docker-entrypoint.sh "$@"