#!/bin/bash

# Couleurs
BLUE='\033[1;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

TOKEN_FILE="/vault/config/root_token"

echo -e "${BLUE}[NGINX] Démarrage du script d'initialisation...${NC}"

# SSL
mkdir -p /etc/nginx/ssl
if [ ! -f /etc/nginx/ssl/transcendence.crt ]; then
    echo -e "${BLUE}[NGINX] Génération des certificats SSL...${NC}"
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/transcendence.key \
        -out /etc/nginx/ssl/transcendence.crt \
        -subj "/C=FR/ST=Paris/L=Paris/O=42/OU=TankGame/CN=localhost"
fi

# Attente Vault
echo -e "${BLUE}[NGINX] Attente du Token de Vault...${NC}"
while [ ! -f "$TOKEN_FILE" ]; do
    sleep 2
done

echo -e "${GREEN}✅ TOKEN DÉTECTÉ : $(cat $TOKEN_FILE)${NC}"

# Test ModSecurity
echo -e "${BLUE}[NGINX] Test de la configuration (ModSecurity)...${NC}"
nginx -t
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ ERREUR : Configuration Nginx/ModSecurity invalide !${NC}"
    tail -f /dev/null
fi

echo -e "${GREEN}[NGINX] Lancement du service...${NC}"
exec nginx -g "daemon off;"