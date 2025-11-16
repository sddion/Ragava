#!/bin/bash

# Script to trigger GitLab CI/CD pipeline for YouTube conversion
# This can be called from the API or manually

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GITLAB_URL="https://gitlab.com"
PROJECT_ID="sju17051/wavemusic"
GITLAB_TOKEN="${GITLAB_TOKEN:-$CI_JOB_TOKEN}"

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  -t, --token TOKEN    GitLab access token"
    echo "  -b, --branch BRANCH  Branch to trigger pipeline on (default: main)"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  GITLAB_TOKEN        GitLab access token"
    echo "  CI_JOB_TOKEN        GitLab CI job token (if running in CI)"
}

# Parse command line arguments
BRANCH="main"
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--token)
            GITLAB_TOKEN="$2"
            shift 2
            ;;
        -b|--branch)
            BRANCH="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_usage
            exit 1
            ;;
    esac
done

# Check if token is available
if [ -z "$GITLAB_TOKEN" ]; then
    echo -e "${RED}❌ GitLab token is required${NC}"
    echo "Set GITLAB_TOKEN environment variable or use -t option"
    exit 1
fi

echo -e "${BLUE}🚀 Triggering GitLab CI/CD pipeline...${NC}"
echo -e "${YELLOW}Project: $PROJECT_ID${NC}"
echo -e "${YELLOW}Branch: $BRANCH${NC}"

# Trigger the pipeline
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "PRIVATE-TOKEN: $GITLAB_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"ref\":\"$BRANCH\",\"variables\":[{\"key\":\"YOUTUBE_CONVERSION_ENABLED\",\"value\":\"true\"}]}" \
    "$GITLAB_URL/api/v4/projects/$(echo $PROJECT_ID | sed 's/\//%2F/g')/pipeline")

# Extract response body and status code
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -eq 201 ]; then
    echo -e "${GREEN}✅ Pipeline triggered successfully!${NC}"
    
    # Extract pipeline ID from response
    PIPELINE_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":[0-9]*' | cut -d':' -f2)
    if [ -n "$PIPELINE_ID" ]; then
        echo -e "${GREEN}📋 Pipeline ID: $PIPELINE_ID${NC}"
        echo -e "${BLUE}🔗 Pipeline URL: $GITLAB_URL/$PROJECT_ID/-/pipelines/$PIPELINE_ID${NC}"
    fi
else
    echo -e "${RED}❌ Failed to trigger pipeline${NC}"
    echo -e "${RED}HTTP Code: $HTTP_CODE${NC}"
    echo -e "${RED}Response: $RESPONSE_BODY${NC}"
    exit 1
fi
