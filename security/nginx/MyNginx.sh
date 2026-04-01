#!/bin/bash

BLUE='\033[1;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

TOKEN_FILE="/vault/config/root_token"

echo -e "${BLUE}[NGINX] Starting the initialization script...${NC}"

echo -e "${BLUE}[NGINX] Waiting for the Vault token...${NC}"
while [ ! -f "$TOKEN_FILE" ]; do
    sleep 2
done

echo -e "${BLUE}[NGINX] Configuration Test (ModSecurity)...${NC}"
nginx -t
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ ERROR: Invalid Nginx/ModSecurity configuration !${NC}"
    tail -f /dev/null
fi

echo -e "${GREEN}[NGINX] Launch of the service...${NC}"
exec nginx -g "daemon off;"