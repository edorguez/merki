# Makefile for Merki Project
.PHONY: help build test test-race lint run generate deps docker-build docker-up docker-down docker-server-up docker-auth-up migrate-up migrate-down clean swagger coverage mobile-apk mobile-aab

# Variables
BINARY_NAME=merki-server
BUILD_DIR=bin
GO=go
GOFLAGS=-v
MODULE_NAME=github.com/edorguez/merki

# Colors for output
GREEN=\033[0;32m
YELLOW=\033[1;33m
RED=\033[0;31m
NC=\033[0m # No Color

# Example: make help
## Help: Display available targets
help:
	@echo "Available targets:"
	@echo "  ${GREEN}build${NC}             - Build the backend binary"
	@echo "  ${GREEN}test${NC}              - Run all tests"
	@echo "  ${GREEN}test-race${NC}         - Run tests with race detector"
	@echo "  ${GREEN}lint${NC}              - Run golangci-lint"
	@echo "  ${GREEN}run${NC}               - Run the backend server"
	@echo "  ${GREEN}generate${NC}          - Generate code from OpenAPI spec"
	@echo "  ${GREEN}deps${NC}              - Install dependencies"
	@echo "  ${GREEN}docker-build${NC}      - Build Docker image for the server"
	@echo "  ${GREEN}docker-up${NC}         - Start all development services using .env.docker"
	@echo "  ${GREEN}docker-down${NC}       - Stop development services"
	@echo "  ${GREEN}docker-server-up${NC}  - Build & restart only the backend server"
	@echo "  ${GREEN}docker-auth-up${NC}    - Build & restart only the auth server"
	@echo "  ${GREEN}migrate-up${NC}        - Run database migrations"
	@echo "  ${GREEN}migrate-down${NC}      - Rollback database migrations"
	@echo "  ${GREEN}clean${NC}             - Clean build artifacts"
	@echo "  ${GREEN}swagger${NC}           - Generate Swagger/OpenAPI documentation"
	@echo "  ${GREEN}coverage${NC}          - Generate test coverage report"
	@echo "  ${GREEN}mobile-apk${NC}        - Build a shareable Android APK (release)"
	@echo "  ${GREEN}mobile-aab${NC}        - Build Android App Bundle (.aab) for production with EAS"

# Example: make build
## Build: Build the backend binary
build:
	@echo "${YELLOW}Building $(BINARY_NAME)...${NC}"
	@mkdir -p $(BUILD_DIR)
	$(GO) build $(GOFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME) ./cmd/server

# Example: make test
## Test: Run all tests
test:
	@echo "${YELLOW}Running tests...${NC}"
	$(GO) test -v ./...

# Example: make test-race
## Test with race detector
test-race:
	@echo "${YELLOW}Running tests with race detector...${NC}"
	$(GO) test -v -race ./...

# Example: make lint
## Lint: Run golangci-lint
lint:
	@echo "${YELLOW}Running linter...${NC}"
	golangci-lint run ./...

# Example: make run
## Run: Run the backend server
run:
	@echo "${YELLOW}Starting server...${NC}"
	$(GO) run ./cmd/server

# Example: make generate
## Generate: Generate code from OpenAPI spec
generate:
	@echo "${YELLOW}Generating Go server stubs from OpenAPI spec...${NC}"
	@if ! command -v oapi-codegen >/dev/null 2>&1; then \
		echo "Installing oapi-codegen..."; \
		go install github.com/deepmap/oapi-codegen/v2/cmd/oapi-codegen@latest; \
	fi
	oapi-codegen -generate types,server -package api docs/openapi.yaml > internal/api/rest/generated.go
	@echo "${YELLOW}Skipping TypeScript client generation (deprecated)${NC}"

# Example: make deps
## Dependencies: Install Go dependencies
deps:
	@echo "${YELLOW}Installing dependencies...${NC}"
	$(GO) mod download
	$(GO) mod tidy
	@echo "${YELLOW}Installing tools...${NC}"
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	go install github.com/deepmap/oapi-codegen/v2/cmd/oapi-codegen@latest
	go install github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Example: make docker-build
## Docker: Build server image
docker-build:
	@echo "${YELLOW}Building Docker image for server...${NC}"
	docker-compose build server

# Example: make docker-up
## Docker Compose: Start all development services with .env.docker
docker-up:
	@echo "${YELLOW}Starting all development services with .env.docker...${NC}"
	docker-compose --env-file .env.docker up -d

# Example: make docker-down
## Docker Compose: Stop development services
docker-down:
	@echo "${YELLOW}Stopping development services...${NC}"
	docker-compose --env-file .env.docker down

# Example: make docker-server-up
## Docker: Build & restart only the backend server (leaves other services running)
docker-server-up:
	@echo "${YELLOW}Building & restarting server service...${NC}"
	docker-compose --env-file .env.docker up -d --build server

# Example: make docker-auth-up
## Docker: Build & restart only the auth server (leaves other services running)
docker-auth-up:
	@echo "${YELLOW}Building & restarting auth-server service...${NC}"
	docker-compose --env-file .env.docker up -d --build auth-server

# Example: make migrate-up
## Migrations: Run database migrations up
migrate-up:
	@echo "${YELLOW}Running database migrations...${NC}"
	@set -a; . ./.env; set +a; \
	migrate -path pkg/database/migrations -database "$$DATABASE_URL" up

# Example: make migrate-down
## Migrations: Rollback database migrations
migrate-down:
	@echo "${YELLOW}Rolling back database migrations...${NC}"
	@set -a; . ./.env; set +a; \
	migrate -path pkg/database/migrations -database "$$DATABASE_URL" down

# Example: make clean
## Clean: Clean build artifacts
clean:
	@echo "${YELLOW}Cleaning build artifacts...${NC}"
	rm -rf $(BUILD_DIR)
	rm -f coverage.out
	find . -name "*.test" -delete

# Example: make swagger
## Swagger: Generate Swagger/OpenAPI documentation
swagger:
	@echo "${YELLOW}Generating Swagger documentation...${NC}"
	@if ! command -v swag >/dev/null 2>&1; then \
		echo "Installing swag..."; \
		go install github.com/swaggo/swag/cmd/swag@latest; \
	fi
	swag init -g cmd/server/main.go -o docs/swagger

# Example: make coverage
## Coverage: Generate test coverage report
coverage:
	@echo "${YELLOW}Generating test coverage report...${NC}"
	$(GO) test -coverprofile=coverage.out ./...
	$(GO) tool cover -html=coverage.out -o coverage.html
	@echo "${GREEN}Coverage report generated: coverage.html${NC}"

# Example: make mobile-apk
## Mobile: Build a shareable Android APK (release) with a readable name
## (AppName-Version.apk). Bump the version first with:
##   make mobile-apk VERSION=1.0.5
mobile-apk:
	@if [ -n "$(VERSION)" ]; then \
		echo "${YELLOW}Setting mobile version to $(VERSION)...${NC}"; \
		node -e "const fs=require('fs');const p='mobile/app.json';const j=JSON.parse(fs.readFileSync(p));j.expo.version='$(VERSION)';fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n');"; \
		echo "${YELLOW}Regenerando proyecto nativo para aplicar la versión...${NC}"; \
		cd mobile && npx expo prebuild --platform android --no-install; \
	fi
	cd mobile/android && ./gradlew assembleRelease
	@APP_NAME=$$(node -e "console.log(require('./mobile/app.json').expo.name.replace(/\s+/g, ''))"); \
	VER=$$(node -e "console.log(require('./mobile/app.json').expo.version)"); \
	APK=$$(ls mobile/android/app/build/outputs/apk/release/app-release.apk mobile/android/app/build/outputs/apk/release/app-*-release.apk 2>/dev/null | head -1); \
	if [ -z "$$APK" ]; then \
		echo "${RED}No se encontró el APK release en mobile/android/app/build/outputs/apk/release/${NC}"; \
		exit 1; \
	fi; \
	DEST=mobile/android/app/build/outputs/apk/release/$${APP_NAME}-$${VER}.apk; \
	cp "$$APK" "$$DEST"; \
	echo "${GREEN}APK listo: $$DEST${NC}"

# Example: make mobile-aab
## Mobile: Build Android App Bundle (.aab) for production with EAS
mobile-aab:
	@echo "${YELLOW}Building Android App Bundle con EAS (production)...${NC}"
	cd mobile && npx eas build --platform android --profile production

## Default target
default: help
