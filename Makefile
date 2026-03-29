# Colors for visibility
GREEN  = \033[0;32m
RED    = \033[0;31m
BLUE   = \033[0;34m
YELLOW = \033[0;33m
RESET  = \033[0m

# Project name
NAME = transcendence

all: certs build up

# 0. Generate SSL certificates (Security)
certs:
	@echo "$(YELLOW)Checking certificates...$(RESET)"
	@mkdir -p app_next/certificates
	@if [ ! -f app_next/certificates/certificate.pem ]; then \
		echo "$(YELLOW)Generating SSL certificates...$(RESET)"; \
		openssl req -x509 -newkey rsa:4096 -keyout app_next/certificates/private-key.pem -out app_next/certificates/certificate.pem -sha256 -days 365 -nodes -subj "/C=FR/ST=Paris/L=Paris/O=42/OU=ft_transcendence/CN=localhost"; \
		echo "$(GREEN)Certificates generated successfully.$(RESET)"; \
	else \
		echo "$(GREEN)Certificates already exist.$(RESET)"; \
	fi

# 1. Build Docker images
build:
	@echo "$(BLUE)Building Docker images...$(RESET)"
	docker compose build

# 2. Start containers
up:
	@echo "$(GREEN)Starting infrastructure...$(RESET)"
	docker compose up -d
	@echo "$(YELLOW)Application logs:$(RESET)"
	docker compose logs -f app

# 3. Stop containers
down:
	@echo "$(BLUE)Stopping containers...$(RESET)"
	docker compose down

# 4. Full cleanup (Inception style)
clean:
	@echo "$(RED)Cleaning containers, volumes and images...$(RESET)"
	docker compose down --volumes --rmi all
	docker run --rm -v $(PWD)/app_next:/app alpine rm -rf /app/.next

# 5. Full restart (Complete reset)
re: clean all

# --- Production ---
prod-build:
	@echo "$(BLUE)Building production Docker images...$(RESET)"
	docker compose -f docker-compose.prod.yml build

prod-up:
	@echo "$(GREEN)Starting production infrastructure...$(RESET)"
	docker compose -f docker-compose.prod.yml up -d
	@echo "$(YELLOW)Production application logs:$(RESET)"
	docker compose -f docker-compose.prod.yml logs -f app

prod-down:
	@echo "$(BLUE)Stopping production containers...$(RESET)"
	docker compose -f docker-compose.prod.yml down

prod-clean:
	@echo "$(RED)Cleaning production containers, volumes and images...$(RESET)"
	docker compose -f docker-compose.prod.yml down --volumes --rmi all

prod-re: prod-clean certs prod-build prod-up

# --- Specific Logs (Color-coded) ---

logs-vault:
	@echo "$(YELLOW)Showing VAULT logs...$(RESET)"
	docker logs -f vault-1

logs-nginx:
	@echo "$(BLUE)Showing NGINX logs...$(RESET)"
	docker logs -f nginx-1

logs-app:
	@echo "$(GREEN)Showing APP logs...$(RESET)"
	docker logs -f app-1

logs-db:
	@echo "$(RED)Showing POSTGRES logs (Errors)...$(RESET)"
	docker logs -f postgres-1

.PHONY: all certs build up down clean re prod-build prod-up prod-down prod-clean prod-re logs-vault logs-nginx logs-app logs-db