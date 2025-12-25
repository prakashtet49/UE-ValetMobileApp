#!/bin/bash

# Firebase App Distribution - iOS
# This script helps distribute the iOS IPA to Firebase App Distribution

set -e

echo "🚀 iOS Distribution Helper"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
FIREBASE_APP_ID="1:556469915246:ios:YOUR_IOS_APP_ID"
TESTER_GROUP="internal-testers"
BUILD_DATE=$(date +%Y-%m-%d)

echo -e "${YELLOW}⚠️  iOS builds must be created in Xcode first${NC}"
echo ""
echo -e "${BLUE}📋 Steps to create iOS build:${NC}"
echo "   1. Open ios/valletMobileApp.xcworkspace in Xcode"
echo "   2. Select 'Any iOS Device' as target"
echo "   3. Product → Archive"
echo "   4. Export as Ad-Hoc or Development"
echo "   5. Save the IPA file"
echo ""

# Ask for IPA path
read -p "Enter path to IPA file (or drag & drop): " IPA_PATH

# Remove quotes if present (from drag & drop)
IPA_PATH=$(echo "$IPA_PATH" | tr -d "'\"")

# Check if IPA exists
if [ ! -f "$IPA_PATH" ]; then
    echo -e "${RED}❌ Error: IPA not found at ${IPA_PATH}${NC}"
    exit 1
fi

echo -e "${GREEN}✅ IPA found!${NC}"
echo ""

# Get release notes
echo -e "${BLUE}📝 Enter release notes (press Enter when done):${NC}"
read -p "> " RELEASE_NOTES

if [ -z "$RELEASE_NOTES" ]; then
    RELEASE_NOTES="iOS Build - ${BUILD_DATE}"
fi

# Distribute to Firebase
echo ""
echo -e "${BLUE}🚀 Distributing to Firebase App Distribution...${NC}"
echo -e "${BLUE}   App ID: ${FIREBASE_APP_ID}${NC}"
echo -e "${BLUE}   Group: ${TESTER_GROUP}${NC}"
echo ""

firebase appdistribution:distribute "$IPA_PATH" \
  --app "$FIREBASE_APP_ID" \
  --groups "$TESTER_GROUP" \
  --release-notes "$RELEASE_NOTES"

echo ""
echo -e "${GREEN}✅ Distribution complete!${NC}"
echo -e "${GREEN}📧 Team members will receive email notifications${NC}"
echo ""
echo -e "${BLUE}📊 View distribution status:${NC}"
echo -e "   https://console.firebase.google.com/project/valetmobileapp-6f619/appdistribution"
echo ""
echo -e "${YELLOW}⚠️  Reminder: iOS testers must trust the developer certificate${NC}"
echo -e "   Settings → General → VPN & Device Management"
