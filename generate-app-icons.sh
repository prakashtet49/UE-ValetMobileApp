#!/bin/bash

# Generate App Icons from UrbanEase Logo
# This script creates all required icon sizes for Android and iOS

set -e

echo "🎨 Generating App Icons from UrbanEase Logo..."

# Source image
SOURCE_IMAGE="./src/assets/icons/urbanease-logo.png"

# Check if source image exists
if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "❌ Error: Source image not found at $SOURCE_IMAGE"
    exit 1
fi

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ Error: ImageMagick is not installed"
    echo "📦 Install with: brew install imagemagick"
    exit 1
fi

echo "✅ Source image found"
echo "✅ ImageMagick installed"

# Android icon directories
ANDROID_RES="./android/app/src/main/res"

# Create a square version with padding for better icon appearance
TEMP_SQUARE="/tmp/urbanease_square.png"
convert "$SOURCE_IMAGE" -gravity center -background "#3156D8" -extent 1024x1024 "$TEMP_SQUARE"

echo ""
echo "📱 Generating Android Icons..."

# Android mipmap sizes
declare -A ANDROID_SIZES=(
    ["mdpi"]="48"
    ["hdpi"]="72"
    ["xhdpi"]="96"
    ["xxhdpi"]="144"
    ["xxxhdpi"]="192"
)

for density in "${!ANDROID_SIZES[@]}"; do
    size=${ANDROID_SIZES[$density]}
    dir="$ANDROID_RES/mipmap-$density"
    
    echo "  → Generating ${density} (${size}x${size})"
    
    # Standard launcher icon
    convert "$TEMP_SQUARE" -resize ${size}x${size} "$dir/ic_launcher.png"
    
    # Round launcher icon
    convert "$TEMP_SQUARE" -resize ${size}x${size} \
        \( +clone -threshold -1 -negate -fill white -draw "circle $((size/2)),$((size/2)) $((size/2)),0" \) \
        -alpha off -compose copy_opacity -composite \
        "$dir/ic_launcher_round.png"
done

echo "✅ Android icons generated"

# iOS icons (if iOS folder exists)
IOS_ASSETS="./ios/valletMobileApp/Images.xcassets/AppIcon.appiconset"

if [ -d "$IOS_ASSETS" ]; then
    echo ""
    echo "🍎 Generating iOS Icons..."
    
    # iOS icon sizes
    declare -A IOS_SIZES=(
        ["Icon-20"]="20"
        ["Icon-20@2x"]="40"
        ["Icon-20@3x"]="60"
        ["Icon-29"]="29"
        ["Icon-29@2x"]="58"
        ["Icon-29@3x"]="87"
        ["Icon-40"]="40"
        ["Icon-40@2x"]="80"
        ["Icon-40@3x"]="120"
        ["Icon-60@2x"]="120"
        ["Icon-60@3x"]="180"
        ["Icon-76"]="76"
        ["Icon-76@2x"]="152"
        ["Icon-83.5@2x"]="167"
        ["Icon-1024"]="1024"
    )
    
    for name in "${!IOS_SIZES[@]}"; do
        size=${IOS_SIZES[$name]}
        echo "  → Generating ${name} (${size}x${size})"
        convert "$TEMP_SQUARE" -resize ${size}x${size} "$IOS_ASSETS/${name}.png"
    done
    
    echo "✅ iOS icons generated"
else
    echo "⚠️  iOS assets folder not found, skipping iOS icons"
fi

# Clean up temp file
rm -f "$TEMP_SQUARE"

echo ""
echo "🎉 Icon generation complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Clean build: cd android && ./gradlew clean && cd .."
echo "  2. Rebuild app: npm run android"
echo "  3. Uninstall old app from device"
echo "  4. Install new app to see the icon"
echo ""
