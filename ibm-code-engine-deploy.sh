#!/bin/bash

# ============================================================================
# IBM Code Engine Deployment Script
# Deploys Albert Research Assistant to IBM Code Engine
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="albert-research-assistant"
APP_NAME="albert-app"
REGISTRY="us.icr.io"  # IBM Container Registry
NAMESPACE="albert-namespace"
IMAGE_NAME="${REGISTRY}/${NAMESPACE}/${APP_NAME}"
IMAGE_TAG="latest"

# ============================================================================
# Helper Functions
# ============================================================================

print_step() {
    echo -e "${GREEN}==>${NC} $1"
}

print_error() {
    echo -e "${RED}ERROR:${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}WARNING:${NC} $1"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 is not installed. Please install it first."
        exit 1
    fi
}

# ============================================================================
# Pre-flight Checks
# ============================================================================

print_step "Running pre-flight checks..."

# Check required commands
check_command "ibmcloud"
check_command "docker"

# Check if logged in to IBM Cloud
if ! ibmcloud target &> /dev/null; then
    print_error "Not logged in to IBM Cloud. Run: ibmcloud login"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_error ".env file not found. Please create it from .env.example"
    exit 1
fi

print_step "Pre-flight checks passed!"

# ============================================================================
# Build Docker Image
# ============================================================================

print_step "Building Docker image..."

docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .

if [ $? -eq 0 ]; then
    print_step "Docker image built successfully!"
else
    print_error "Docker build failed"
    exit 1
fi

# ============================================================================
# Push to IBM Container Registry
# ============================================================================

print_step "Logging in to IBM Container Registry..."

ibmcloud cr login

print_step "Creating namespace (if it doesn't exist)..."
ibmcloud cr namespace-add ${NAMESPACE} || true

print_step "Pushing image to IBM Container Registry..."

docker push ${IMAGE_NAME}:${IMAGE_TAG}

if [ $? -eq 0 ]; then
    print_step "Image pushed successfully!"
else
    print_error "Image push failed"
    exit 1
fi

# ============================================================================
# Deploy to Code Engine
# ============================================================================

print_step "Deploying to IBM Code Engine..."

# Target Code Engine
ibmcloud ce project select --name ${PROJECT_NAME} || {
    print_warning "Project not found. Creating new project..."
    ibmcloud ce project create --name ${PROJECT_NAME}
    ibmcloud ce project select --name ${PROJECT_NAME}
}

# Create or update application
print_step "Creating/updating Code Engine application..."

# Check if app exists
if ibmcloud ce app get --name ${APP_NAME} &> /dev/null; then
    print_step "Updating existing application..."
    ibmcloud ce app update --name ${APP_NAME} \
        --image ${IMAGE_NAME}:${IMAGE_TAG} \
        --port 8080 \
        --min-scale 1 \
        --max-scale 5 \
        --cpu 1 \
        --memory 2G \
        --env-from-secret albert-secrets
else
    print_step "Creating new application..."
    ibmcloud ce app create --name ${APP_NAME} \
        --image ${IMAGE_NAME}:${IMAGE_TAG} \
        --port 8080 \
        --min-scale 1 \
        --max-scale 5 \
        --cpu 1 \
        --memory 2G \
        --env-from-secret albert-secrets
fi

# ============================================================================
# Get Application URL
# ============================================================================

print_step "Getting application URL..."

APP_URL=$(ibmcloud ce app get --name ${APP_NAME} --output json | grep -o '"url":"[^"]*' | cut -d'"' -f4)

if [ -n "$APP_URL" ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Deployment Successful!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "Application URL: ${GREEN}${APP_URL}${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Set up environment secrets: ./setup-secrets.sh"
    echo "2. Run database migrations: npm run migrate"
    echo "3. Initialize admin user: npm run init-admin"
    echo "4. Visit the application URL above"
    echo ""
else
    print_error "Could not retrieve application URL"
    exit 1
fi

# ============================================================================
# Health Check
# ============================================================================

print_step "Performing health check..."

sleep 10  # Wait for app to start

if curl -f "${APP_URL}/health" &> /dev/null; then
    print_step "Health check passed! Application is running."
else
    print_warning "Health check failed. Application may still be starting up."
    echo "Check status with: ibmcloud ce app get --name ${APP_NAME}"
fi

print_step "Deployment complete!"

# Made with Bob
