#!/bin/bash
set -m

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
PINK='\033[1;35m'
NC='\033[0m'

CONFIG_DIR="/vault/config"
CERTS_DIR="/vault/certs"
export VAULT_ADDR='https://127.0.0.1:8200'
export VAULT_SKIP_VERIFY=true

mkdir -p "$CERTS_DIR"
mkdir -p "$CONFIG_DIR"

if [ ! -f "$CERTS_DIR/cert.pem" ]; then
    echo -e "${YELLOW}[VAULT] No certificate found. Initial SSL generation...${NC}"
    
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$CERTS_DIR/private-key.pem" \
        -out "$CERTS_DIR/cert.pem" \
        -subj "/C=FR/ST=Paris/L=Paris/O=42/CN=localhost"
    
    chmod 644 "$CERTS_DIR/cert.pem"
    chmod 644 "$CERTS_DIR/private-key.pem"
    
    echo -e "${GREEN}✅ SSL certificates successfully generated.${NC}"
else
    echo -e "${GREEN}✅ Using existing SSL certificates.${NC}"
fi

echo -e "${YELLOW}[VAULT] Starting Vault server with HTTPS config...${NC}"
vault server -config="$CONFIG_DIR/config.hcl" &
VAULT_PID=$!

until curl -s -k $VAULT_ADDR/v1/sys/health > /dev/null; do
    echo -e "${YELLOW}[VAULT] Waiting for server health check...${NC}"
    sleep 1
done

INIT_STATUS=$(vault status -tls-skip-verify -format=json 2>/dev/null | grep '"initialized":' | awk '{print $2}' | tr -d ',' || echo "unknown")

if [ "$INIT_STATUS" == "false" ]; then
    echo -e "${YELLOW}[VAULT] First use: Initializing Vault...${NC}"
    INIT_OUT=$(vault operator init -key-shares=1 -key-threshold=1 -format=json 2>/dev/null)

    if [ $? -eq 0 ]; then
        UNSEAL_KEY=$(echo -e "$INIT_OUT" | grep -A 1 '"unseal_keys_b64"' | grep '"' | tail -n 1 | sed 's/[^"]*"//;s/".*//')

        ROOT_TOKEN=$(echo "$INIT_OUT" | grep '"root_token"' | cut -d'"' -f4)

        echo "$UNSEAL_KEY" > "$CONFIG_DIR/unseal_key"
        echo "$ROOT_TOKEN" > "$CONFIG_DIR/root_token"

        echo -e "${GREEN}✅ Initialization successful.${NC}"
    else
        echo -e "${RED}❌ ERROR: Initialization failed!${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ TOKEN DETECTED${NC}"
fi

if [ -f "$CONFIG_DIR/unseal_key" ]; then
    echo -e "${YELLOW}[VAULT] Unsealing...${NC}"
    vault operator unseal $(cat "$CONFIG_DIR/unseal_key")
else
    echo -e "${RED}❌ ERROR: Unseal key missing!${NC}"
    exit 1
fi

export VAULT_TOKEN=$(cat "$CONFIG_DIR/root_token")

if ! vault secrets list | grep -q "secret/"; then
    vault secrets enable -path=secret kv-v2
fi

if ! vault kv get secret/transcendence > /dev/null 2>&1; then
    echo -e "${YELLOW}[VAULT] Generating fresh secrets...${NC}"
    RAND_PASS=$(openssl rand -hex 16)
    RAND_NEXT_SEC=$(openssl rand -hex 24)
    
    vault kv put secret/transcendence \
        DB_USER="transcendence" \
        DB_PASSWORD="$RAND_PASS" \
        DB_NAME="db_transcendence" \
        NEXTAUTH_URL="https://localhost:8443" \
        NEXTAUTH_SECRET="$RAND_NEXT_SEC"
fi

echo -e "${YELLOW}[VAULT] Creating internal.env for the App...${NC}"
DB_U=$(vault kv get -field=DB_USER secret/transcendence)
DB_P=$(vault kv get -field=DB_PASSWORD secret/transcendence)
DB_N=$(vault kv get -field=DB_NAME secret/transcendence)
N_URL=$(vault kv get -field=NEXTAUTH_URL secret/transcendence)
N_SEC=$(vault kv get -field=NEXTAUTH_SECRET secret/transcendence)

{
    echo "POSTGRES_USER=$DB_U"
    echo "POSTGRES_PASSWORD=$DB_P"
    echo "POSTGRES_DB=$DB_N"
    echo "NEXTAUTH_URL=$N_URL"
    echo "NEXTAUTH_SECRET=$N_SEC"
    echo "DATABASE_URL=postgresql://$DB_U:$DB_P@postgres:5432/$DB_N"
} > "$CONFIG_DIR/internal.env"

chmod 644 "$CONFIG_DIR/internal.env"
echo -e "${GREEN}---------------------------------------------------"
echo -e "✅ VAULT READY, SECURED AND UNLOCKED!"
echo -e "---------------------------------------------------${NC}"

wait $VAULT_PID