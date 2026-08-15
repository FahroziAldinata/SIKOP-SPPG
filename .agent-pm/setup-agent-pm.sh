#!/bin/bash

# AGENT-PM SETUP SCRIPT
# This script configures .agent-pm directory for a new project/user

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting AGENT-PM Setup...${NC}"

# Check if config file exists
if [ ! -f "config.json" ]; then
    echo -e "${RED}❌ config.json not found!${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Reading configuration...${NC}"

# Extract configuration values using jq (if available) or fallback to grep
if command -v jq &> /dev/null; then
    PROJECT_NAME=$(jq -r '.project.name' config.json)
    PROJECT_ROOT=$(jq -r '.project.root_path' config.json)
    USER_NAME=$(jq -r '.user.name' config.json)
    AGY_PATH_LAPTOP=$(jq -r '.agent.agy.path_laptop' config.json)
    AGY_PATH_PC=$(jq -r '.agent.agy.path_pc' config.json)
    TELEGRAM_BOT_TOKEN=$(jq -r '.telegram.bot_token' config.json)
    TELEGRAM_USER_ID=$(jq -r '.telegram.user_id' config.json)
else
    echo -e "${YELLOW}⚠️  jq not found, using fallback method${NC}"
    PROJECT_NAME=$(grep '"name"' config.json | cut -d'"' -f4)
    PROJECT_ROOT=$(grep '"root_path"' config.json | cut -d'"' -f4)
    USER_NAME=$(grep '"name"' config.json | grep -v '"project"' | cut -d'"' -f4)
    AGY_PATH_LAPTOP=$(grep '"path_laptop"' config.json | cut -d'"' -f4)
    AGY_PATH_PC=$(grep '"path_pc"' config.json | cut -d'"' -f4)
    TELEGRAM_BOT_TOKEN=$(grep '"bot_token"' config.json | cut -d'"' -f4)
    TELEGRAM_USER_ID=$(grep '"user_id"' config.json | cut -d'"' -f4)
fi

echo -e "${GREEN}✓ Configuration loaded:${NC}"
echo "  Project: $PROJECT_NAME"
echo "  Root: $PROJECT_ROOT"
echo "  User: $USER_NAME"
echo "  Telegram Bot: $TELEGRAM_BOT_TOKEN"
echo "  Telegram User ID: $TELEGRAM_USER_ID"

# Create backup
echo -e "${YELLOW}🔄 Creating backup...${NC}"
mkdir -p backup
cp -r ./* backup/ 2>/dev/null || true

# Replace placeholders in all markdown files
echo -e "${YELLOW}🔄 Replacing placeholders...${NC}"
find . -name "*.md" -type f | while read file; do
    if [[ "$file" != "./backup/"* ]] && [[ "$file" != "./config.json" ]] && [[ "$file" != "./config.template.json" ]]; then
        echo "  Processing: $file"
        
        # Replace all placeholders
        sed -i "s/\[PROJECT_NAME\]/$PROJECT_NAME/g" "$file"
        sed -i "s/\[PROJECT_DESCRIPTION\]/$PROJECT_DESCRIPTION/g" "$file"
        sed -i "s/\[PROJECT_ROOT\]/$PROJECT_ROOT/g" "$file"
        sed -i "s/\[USER_NAME\]/$USER_NAME/g" "$file"
        sed -i "s/\[USER_EMAIL\]/$USER_EMAIL/g" "$file"
        sed -i "s/\[USER_ROLE\]/$USER_ROLE/g" "$file"
        sed -i "s/\[AGY_PATH_LAPTOP\]/$AGY_PATH_LAPTOP/g" "$file"
        sed -i "s/\[AGY_PATH_PC\]/$AGY_PATH_PC/g" "$file"
        sed -i "s/\[AGY_TIMEOUT\]/$AGY_TIMEOUT/g" "$file"
        sed -i "s/\[AGY_MODEL_PRIMARY\]/$AGY_MODEL_PRIMARY/g" "$file"
        sed -i "s/\[AGY_MODEL_BACKUP\]/$AGY_MODEL_BACKUP/g" "$file"
        sed -i "s/\[NODE_VERSION\]/$NODE_VERSION/g" "$file"
        sed -i "s/\[NPM_VERSION\]/$NPM_VERSION/g" "$file"
        sed -i "s/\[DEFAULT_BUILDER\]/$DEFAULT_BUILDER/g" "$file"
        sed -i "s/\[COMMIT_TOOL\]/$COMMIT_TOOL/g" "$file"
        sed -i "s/\[TELEGRAM_BOT_TOKEN\]/$TELEGRAM_BOT_TOKEN/g" "$file"
        sed -i "s/\[TELEGRAM_USER_ID\]/$TELEGRAM_USER_ID/g" "$file"
        sed -i "s/\[TELEGRAM_SERVICE_NAME\]/$TELEGRAM_SERVICE_NAME/g" "$file"
        sed -i "s/\[TELEGRAM_SCRIPT_PATH\]/$TELEGRAM_SCRIPT_PATH/g" "$file"
        sed -i "s/\[TELEGRAM_PID\]/$TELEGRAM_PID/g" "$file"
        sed -i "s/\[TELEGRAM_PROFILE_NAME\]/$TELEGRAM_PROFILE_NAME/g" "$file"
        sed -i "s/\[TELEGRAM_HOME_CHANNEL\]/$TELEGRAM_HOME_CHANNEL/g" "$file"
        sed -i "s/\[IDLE_THRESHOLD\]/$IDLE_THRESHOLD/g" "$file"
        sed -i "s/\[SNAPSHOT_INTERVAL\]/$SNAPSHOT_INTERVAL/g" "$file"
    fi
done

# Clean up config files
echo -e "${YELLOW}🧹 Cleaning up...${NC}"
rm -f config.json config.template.json

echo -e "${GREEN}✅ Setup completed successfully!${NC}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Review the configured files in .agent-pm/"
echo "2. Test with a simple task"
echo "3. Customize any additional settings as needed"
echo ""
echo -e "${GREEN}🎉 Your AGENT-PM is now ready for use!${NC}"

# Verify no placeholders remain
echo ""
echo -e "${YELLOW}🔍 Verifying configuration...${NC}"
remaining_placeholders=$(find . -name "*.md" -exec grep -l "\[.*\]" {} \; 2>/dev/null | head -5)

if [ -z "$remaining_placeholders" ]; then
    echo -e "${GREEN}✅ No placeholders found!${NC}"
else
    echo -e "${YELLOW}⚠️  Some placeholders may remain in:${NC}"
    echo "$remaining_placeholders"
fi