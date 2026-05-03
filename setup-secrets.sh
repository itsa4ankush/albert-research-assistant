#!/bin/bash

# ============================================================================
# IBM Code Engine Secrets Setup Script
# Creates secrets for Albert Research Assistant
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="albert-research-assistant"
SECRET_NAME="albert-secrets"

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

# ============================================================================
# Load Environment Variables
# ============================================================================

print_step "Loading environment variables from .env file..."

if [ ! -f ".env" ]; then
    print_error ".env file not found. Please create it from .env.example"
    exit 1
fi

# Source .env file
set -a
source .env
set +a

print_step "Environment variables loaded!"

# ============================================================================
# Validate Required Variables
# ============================================================================

print_step "Validating required environment variables..."

REQUIRED_VARS=(
    "WATSONX_API_KEY"
    "WATSONX_PROJECT_ID"
    "IBM_COS_API_KEY"
    "IBM_COS_INSTANCE_ID"
    "IBM_COS_ENDPOINT"
    "IBM_COS_BUCKET"
    "IBM_DB_CONNECTION_STRING"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    print_error "Missing required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    exit 1
fi

print_step "All required variables present!"

# ============================================================================
# Select Code Engine Project
# ============================================================================

print_step "Selecting Code Engine project..."

ibmcloud ce project select --name ${PROJECT_NAME} || {
    print_error "Project ${PROJECT_NAME} not found. Please create it first."
    exit 1
}

# ============================================================================
# Create or Update Secret
# ============================================================================

print_step "Creating/updating Code Engine secret..."

# Check if secret exists
if ibmcloud ce secret get --name ${SECRET_NAME} &> /dev/null; then
    print_step "Updating existing secret..."
    ibmcloud ce secret update --name ${SECRET_NAME} \
        --from-env-file .env
else
    print_step "Creating new secret..."
    ibmcloud ce secret create --name ${SECRET_NAME} \
        --from-env-file .env
fi

if [ $? -eq 0 ]; then
    print_step "Secret created/updated successfully!"
else
    print_error "Failed to create/update secret"
    exit 1
fi

# ============================================================================
# Verify Secret
# ============================================================================

print_step "Verifying secret..."

SECRET_KEYS=$(ibmcloud ce secret get --name ${SECRET_NAME} --output json | grep -o '"name":"[^"]*' | cut -d'"' -f4)

echo ""
echo -e "${GREEN}Secret keys configured:${NC}"
echo "$SECRET_KEYS" | while read key; do
    echo "  ✓ $key"
done
echo ""

# ============================================================================
# Summary
# ============================================================================

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Secrets Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Deploy application: ./ibm-code-engine-deploy.sh"
echo "2. Run database migrations: npm run migrate"
echo "3. Initialize admin user: npm run init-admin"
echo ""

print_step "Setup complete!"

# Made with Bob
