# Set UrbanEase Logo as App Icon

## 📱 Current Status

The app currently uses default React Native icons. We need to replace them with the UrbanEase logo.

## 🎯 Objective

Set `src/assets/icons/urbanease-logo.png` as the app icon for both Android and iOS.

## 📋 Required Icon Sizes

### Android (mipmap folders)
- **mdpi**: 48x48px
- **hdpi**: 72x72px
- **xhdpi**: 96x96px
- **xxhdpi**: 144x144px
- **xxxhdpi**: 192x192px

### iOS (AppIcon.appiconset)
- Multiple sizes from 20x20 to 1024x1024

## 🛠️ Solution Options

### Option 1: Use Online Icon Generator (Recommended)

1. **Visit**: https://www.appicon.co/ or https://easyappicon.com/
2. **Upload**: `src/assets/icons/urbanease-logo.png`
3. **Generate**: All required sizes for Android & iOS
4. **Download**: The generated icon pack
5. **Replace**: 
   - Android: Copy to `android/app/src/main/res/mipmap-*/`
   - iOS: Copy to `ios/valletMobileApp/Images.xcassets/AppIcon.appiconset/`

### Option 2: Use react-native-make (CLI Tool)

```bash
# Install
npm install -g @bam.tech/react-native-make

# Generate icons
react-native set-icon --path ./src/assets/icons/urbanease-logo.png
```

### Option 3: Manual Generation with ImageMagick

```bash
# Install ImageMagick (if not installed)
brew install imagemagick

# Run the generation script
chmod +x generate-app-icons.sh
./generate-app-icons.sh
```

## 📝 Manual Steps (If needed)

### For Android:

1. Generate icon sizes using an online tool or ImageMagick
2. Replace icons in these folders:
   ```
   android/app/src/main/res/mipmap-mdpi/ic_launcher.png (48x48)
   android/app/src/main/res/mipmap-hdpi/ic_launcher.png (72x72)
   android/app/src/main/res/mipmap-xhdpi/ic_launcher.png (96x96)
   android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png (144x144)
   android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png (192x192)
   ```
3. Also replace `ic_launcher_round.png` in the same folders

### For iOS:

1. Open Xcode
2. Navigate to `ios/valletMobileApp/Images.xcassets/AppIcon.appiconset/`
3. Drag and drop the generated icons
4. Or use the asset catalog in Xcode to add icons

## 🚀 Quick Start (Recommended)

### Step 1: Install Icon Generator Tool

```bash
npm install -g @bam.tech/react-native-make
```

### Step 2: Generate Icons

```bash
cd /Users/prakashtiwari/CascadeProjects/windsurf-project/valletMobileApp
react-native set-icon --path ./src/assets/icons/urbanease-logo.png
```

### Step 3: Rebuild App

```bash
# For Android
cd android && ./gradlew clean && cd ..
npm run android

# For iOS
cd ios && pod install && cd ..
npm run ios
```

## 📦 Alternative: Use Icon Generator Script

I've created a script that uses ImageMagick to generate all required sizes:

```bash
# Make script executable
chmod +x generate-app-icons.sh

# Run script
./generate-app-icons.sh
```

## ✅ Verification

After setting the icon:

1. **Uninstall** the old app from device/emulator
2. **Rebuild** and install the app
3. **Check** home screen for new icon
4. **Verify** splash screen (if applicable)

## 🎨 Icon Design Tips

Current logo is good, but for best results:

- ✅ Square format (1024x1024 recommended)
- ✅ No transparency for Android (use solid background)
- ✅ Simple design (recognizable at small sizes)
- ✅ High contrast
- ✅ Centered content with padding

## 📱 Current Icon Locations

### Android:
```
android/app/src/main/res/
├── mipmap-mdpi/
│   ├── ic_launcher.png
│   └── ic_launcher_round.png
├── mipmap-hdpi/
│   ├── ic_launcher.png
│   └── ic_launcher_round.png
├── mipmap-xhdpi/
│   ├── ic_launcher.png
│   └── ic_launcher_round.png
├── mipmap-xxhdpi/
│   ├── ic_launcher.png
│   └── ic_launcher_round.png
└── mipmap-xxxhdpi/
    ├── ic_launcher.png
    └── ic_launcher_round.png
```

### iOS:
```
ios/valletMobileApp/Images.xcassets/AppIcon.appiconset/
```

## 🔧 Troubleshooting

### Icon not updating?
1. Clean build: `cd android && ./gradlew clean`
2. Uninstall app from device
3. Rebuild: `npm run android`

### Wrong icon showing?
1. Check all mipmap folders have new icons
2. Clear app cache
3. Restart device/emulator

### Icon looks blurry?
1. Ensure source image is high resolution (1024x1024)
2. Use PNG format
3. Regenerate with proper tool

## 📚 Resources

- [React Native Icons Guide](https://reactnative.dev/docs/image#static-image-resources)
- [Android Icon Guidelines](https://developer.android.com/guide/practices/ui_guidelines/icon_design_launcher)
- [iOS Icon Guidelines](https://developer.apple.com/design/human-interface-guidelines/app-icons)

## 🎯 Next Steps

1. Choose one of the methods above
2. Generate icons
3. Replace existing icons
4. Clean build
5. Test on device

The UrbanEase logo will be your new app icon! 🎉
