#!/bin/bash

# UrbanEase Valet - Deployment Setup Script
# This script prepares the app for deployment

set -e

echo "🚀 UrbanEase Valet - Deployment Setup"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -f "app.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "✅ Project directory verified"
echo ""

# Step 1: Verify app name
echo "📱 Step 1: Verifying app configuration..."
APP_NAME=$(grep -o '"displayName": "[^"]*"' app.json | cut -d'"' -f4)
if [ "$APP_NAME" = "UrbanEase Valet" ]; then
    echo "   ✅ App name: $APP_NAME"
else
    echo "   ⚠️  App name: $APP_NAME (expected: UrbanEase Valet)"
fi
echo ""

# Step 2: Check icon file
echo "🎨 Step 2: Checking app icon..."
if [ -f "src/assets/icons/icon.png" ]; then
    echo "   ✅ Icon file found: src/assets/icons/icon.png"
else
    echo "   ❌ Icon file not found: src/assets/icons/icon.png"
    exit 1
fi
echo ""

# Step 3: Generate app icons
echo "🔧 Step 3: Generating app icons..."
echo ""
echo "Choose a method:"
echo "  1) Use online generator (recommended)"
echo "  2) Use CLI tool (@bam.tech/react-native-make)"
echo "  3) Skip icon generation"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "📋 Manual steps:"
        echo "   1. Go to: https://www.appicon.co/"
        echo "   2. Upload: src/assets/icons/icon.png"
        echo "   3. Download generated icons"
        echo "   4. Copy to android/app/src/main/res/mipmap-*/"
        echo ""
        read -p "Press Enter when done..."
        ;;
    2)
        echo ""
        echo "Installing @bam.tech/react-native-make..."
        if ! command -v react-native &> /dev/null; then
            npm install -g @bam.tech/react-native-make
        fi
        
        echo "Generating icons..."
        react-native set-icon --path ./src/assets/icons/icon.png
        
        echo "   ✅ Icons generated"
        ;;
    3)
        echo "   ⏭️  Skipping icon generation"
        ;;
    *)
        echo "   ❌ Invalid choice"
        exit 1
        ;;
esac
echo ""

# Step 4: Clean build
echo "🧹 Step 4: Cleaning build..."
cd android
./gradlew clean > /dev/null 2>&1
cd ..
echo "   ✅ Build cleaned"
echo ""

# Step 5: Verify configuration
echo "📋 Step 5: Configuration Summary"
echo "================================"
echo "App Name: UrbanEase Valet"
echo "Package: com.valletmobileapp"
echo "Icon: src/assets/icons/icon.png"
echo ""

# Step 6: Next steps
echo "🎯 Next Steps:"
echo "=============="
echo ""
echo "For Testing (APK):"
echo "  cd android && ./gradlew assembleRelease && cd .."
echo "  adb install android/app/build/outputs/apk/release/app-release.apk"
echo ""
echo "For Play Store (AAB):"
echo "  cd android && ./gradlew bundleRelease && cd .."
echo "  # Upload: android/app/build/outputs/bundle/release/app-release.aab"
echo ""
echo "📚 See DEPLOYMENT_SETUP.md for detailed instructions"
echo ""
echo "✅ Setup complete! Ready for deployment 🚀"
