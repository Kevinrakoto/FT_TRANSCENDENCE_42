# Colors for visibility
GREEN  = \033[0;32m
RED    = \033[0;31m
BLUE   = \033[0;34m
YELLOW = \033[0;33m
RESET  = \033[0m

# Project name
NAME = transcendence

all: build up


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
	@echo "$(RED)Removing local certificates...$(RESET)"
	rm -rf app_next/certificates

# 5. Full restart (Complete reset)
re: clean all

.PHONY: all build up down clean re