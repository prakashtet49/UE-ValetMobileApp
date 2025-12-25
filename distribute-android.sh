#!/bin/bash

# Firebase App Distribution - Android
# This script builds and distributes the Android APK to Firebase App Distribution

set -e

echo "🚀 Starting Android distribution process..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
FIREBASE_APP_ID="1:556469915246:android:YOUR_ANDROID_APP_ID"
TESTER_GROUP="internal-testers"
BUILD_DATE=$(date +%Y-%m-%d)
VERSION=$(grep "versionName" android/app/build.gradle | awk '{print $2}' | tr -d '"')

echo -e "${BLUE}📱 App Version: ${VERSION}${NC}"
echo -e "${BLUE}📅 Build Date: ${BUILD_DATE}${NC}"
echo ""

# Step 1: Clean previous builds
echo -e "${BLUE}🧹 Cleaning previous builds...${NC}"
cd android
./gradlew clean
cd ..

# Step 2: Build Release APK
echo -e "${BLUE}🔨 Building release APK...${NC}"
cd android
./gradlew assembleRelease
cd ..

APK_PATH="android/app/build/outputs/apk/release/app-release.apk"

# Check if APK was built successfully
if [ ! -f "$APK_PATH" ]; then
    echo -e "${RED}❌ Error: APK not found at ${APK_PATH}${NC}"
    exit 1
fi

echo -e "${GREEN}✅ APK built successfully!${NC}"
echo -e "${BLUE}📦 APK Location: ${APK_PATH}${NC}"
echo ""

# Step 3: Get release notes
echo -e "${BLUE}📝 Enter release notes (press Enter when done):${NC}"
read -p "> " RELEASE_NOTES

if [ -z "$RELEASE_NOTES" ]; then
    RELEASE_NOTES="Build ${VERSION} - ${BUILD_DATE}"
fi

# Step 4: Distribute to Firebase
echo ""
echo -e "${BLUE}🚀 Distributing to Firebase App Distribution...${NC}"
echo -e "${BLUE}   App ID: ${FIREBASE_APP_ID}${NC}"
echo -e "${BLUE}   Group: ${TESTER_GROUP}${NC}"
echo ""

firebase appdistribution:distribute "$APK_PATH" \
  --app "$FIREBASE_APP_ID" \
  --groups "$TESTER_GROUP" \
  --release-notes "$RELEASE_NOTES"

echo ""
echo -e "${GREEN}✅ Distribution complete!${NC}"
echo -e "${GREEN}📧 Team members will receive email notifications${NC}"
echo ""
echo -e "${BLUE}📊 View distribution status:${NC}"
echo -e "   https://console.firebase.google.com/project/valetmobileapp-6f619/appdistribution"
