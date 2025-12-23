# 🚀 Deployment Setup - UrbanEase Valet

## ✅ App Configuration

### App Name
- **Display Name**: UrbanEase Valet
- **Package Name**: com.valletmobileapp
- **Internal Name**: UrbanEaseValet

### App Icon
- **Source**: `src/assets/icons/icon.png`
- **Design**: Blue gradient square with "UE" logo
- **Format**: PNG with rounded corners

## 📋 Pre-Deployment Checklist

### 1. App Name ✅
- [x] Updated `app.json` → `displayName: "UrbanEase Valet"`
- [x] Updated `android/app/src/main/res/values/strings.xml` → Already set

### 2. App Icon Setup

You need to generate app icons from `src/assets/icons/icon.png` for all required sizes.

## 🎨 Generate App Icons

### Method 1: Online Generator (Recommended)

1. **Go to**: https://www.appicon.co/
2. **Upload**: `src/assets/icons/icon.png`
3. **Generate**: Click "Generate" button
4. **Download**: ZIP file with all sizes

### Method 2: CLI Tool

```bash
# Install
npm install -g @bam.tech/react-native-make

# Generate icons from icon.png
react-native set-icon --path ./src/assets/icons/icon.png
```

## 📦 Install Generated Icons

### For Android:

After generating icons, copy them to:

```
android/app/src/main/res/
├── mipmap-mdpi/
│   ├── ic_launcher.png (48x48)
│   └── ic_launcher_round.png
├── mipmap-hdpi/
│   ├── ic_launcher.png (72x72)
│   └── ic_launcher_round.png
├── mipmap-xhdpi/
│   ├── ic_launcher.png (96x96)
│   └── ic_launcher_round.png
├── mipmap-xxhdpi/
│   ├── ic_launcher.png (144x144)
│   └── ic_launcher_round.png
└── mipmap-xxxhdpi/
    ├── ic_launcher.png (192x192)
    └── ic_launcher_round.png
```

## 🔧 Build Configuration

### Android Release Build

#### Step 1: Generate Signing Key

```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 \
  -keystore urbanease-valet-release.keystore \
  -alias urbanease-valet \
  -keyalg RSA -keysize 2048 -validity 10000
```

**Save these details securely:**
- Keystore password
- Key alias: urbanease-valet
- Key password

#### Step 2: Configure Gradle

Create/Edit `android/gradle.properties`:

```properties
MYAPP_RELEASE_STORE_FILE=urbanease-valet-release.keystore
MYAPP_RELEASE_KEY_ALIAS=urbanease-valet
MYAPP_RELEASE_STORE_PASSWORD=your_keystore_password
MYAPP_RELEASE_KEY_PASSWORD=your_key_password
```

#### Step 3: Update build.gradle

Edit `android/app/build.gradle`:

```gradle
android {
    ...
    defaultConfig {
        applicationId "com.valletmobileapp"
        minSdkVersion 24
        targetSdkVersion 36
        versionCode 1
        versionName "1.0.0"
    }
    
    signingConfigs {
        release {
            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
                storeFile file(MYAPP_RELEASE_STORE_FILE)
                storePassword MYAPP_RELEASE_STORE_PASSWORD
                keyAlias MYAPP_RELEASE_KEY_ALIAS
                keyPassword MYAPP_RELEASE_KEY_PASSWORD
            }
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

## 🏗️ Build Commands

### Android APK (for testing)

```bash
cd android
./gradlew clean
./gradlew assembleRelease
cd ..
```

**Output**: `android/app/build/outputs/apk/release/app-release.apk`

### Android AAB (for Play Store)

```bash
cd android
./gradlew clean
./gradlew bundleRelease
cd ..
```

**Output**: `android/app/build/outputs/bundle/release/app-release.aab`

## 📱 Testing Release Build

### Install APK on Device

```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

### Test Checklist

- [ ] App name shows as "UrbanEase Valet"
- [ ] App icon displays correctly
- [ ] All features work in release mode
- [ ] No console errors
- [ ] API connections work
- [ ] WebSocket connections stable
- [ ] Login/logout functions properly
- [ ] All screens navigate correctly

## 🔐 Security Checklist

- [ ] API keys secured (not hardcoded)
- [ ] ProGuard/R8 enabled for code obfuscation
- [ ] SSL/TLS certificate pinning (if applicable)
- [ ] Keystore file backed up securely
- [ ] Keystore passwords stored securely (not in git)
- [ ] Debug logs removed/disabled in production

## 📊 Version Management

### Current Version
- **Version Code**: 1
- **Version Name**: 1.0.0

### Update Version

Edit `android/app/build.gradle`:

```gradle
defaultConfig {
    versionCode 2        // Increment for each release
    versionName "1.0.1"  // Update as needed
}
```

## 🚀 Deployment Steps

### 1. Prepare for Release

```bash
# Clean project
cd android && ./gradlew clean && cd ..

# Update version numbers
# Edit android/app/build.gradle

# Generate icons (if not done)
react-native set-icon --path ./src/assets/icons/icon.png
```

### 2. Build Release

```bash
# For Play Store (AAB)
cd android
./gradlew bundleRelease
cd ..

# For direct distribution (APK)
cd android
./gradlew assembleRelease
cd ..
```

### 3. Test Release Build

```bash
# Install on device
adb install android/app/build/outputs/apk/release/app-release.apk

# Test all features
```

### 4. Upload to Play Store

1. Go to [Google Play Console](https://play.google.com/console)
2. Create new app or select existing
3. Upload AAB file
4. Fill in store listing details
5. Submit for review

## 📝 Store Listing Details

### App Information

- **App Name**: UrbanEase Valet
- **Short Description**: Professional valet parking management app
- **Full Description**: 
  ```
  UrbanEase Valet is a comprehensive valet parking management solution 
  designed for professional valet drivers. Manage parking jobs, handle 
  pickups, track vehicles, and deliver exceptional service with ease.
  
  Features:
  • Real-time job management
  • Vehicle tracking
  • Pickup request handling
  • Performance statistics
  • Location-based operations
  • Instant notifications
  ```

### Required Assets

- **App Icon**: 512x512 PNG (use icon.png)
- **Feature Graphic**: 1024x500 PNG
- **Screenshots**: At least 2 (phone), 7-inch and 10-inch tablet optional
- **Privacy Policy URL**: Required

### Categories

- **Primary**: Business
- **Secondary**: Productivity

## 🎯 Quick Start Commands

```bash
# 1. Generate app icons
npm install -g @bam.tech/react-native-make
react-native set-icon --path ./src/assets/icons/icon.png

# 2. Clean build
cd android && ./gradlew clean && cd ..

# 3. Build release AAB
cd android && ./gradlew bundleRelease && cd ..

# 4. Test APK
cd android && ./gradlew assembleRelease && cd ..
adb install android/app/build/outputs/apk/release/app-release.apk
```

## 📂 Important Files

### Configuration
- `app.json` - App display name
- `android/app/src/main/res/values/strings.xml` - Android app name
- `android/app/build.gradle` - Version, signing config
- `android/gradle.properties` - Keystore credentials

### Assets
- `src/assets/icons/icon.png` - Source app icon
- `android/app/src/main/res/mipmap-*/` - Generated app icons

### Build Outputs
- `android/app/build/outputs/apk/release/app-release.apk` - APK file
- `android/app/build/outputs/bundle/release/app-release.aab` - AAB file

## ⚠️ Important Notes

1. **Never commit keystore files to git**
2. **Backup keystore and passwords securely**
3. **Test release build thoroughly before uploading**
4. **Update version code for each release**
5. **Keep signing key secure - losing it means you can't update the app**

## 🆘 Troubleshooting

### Build Fails

```bash
# Clean everything
cd android
./gradlew clean
./gradlew cleanBuildCache
rm -rf .gradle
cd ..

# Clear node modules
rm -rf node_modules
npm install

# Try again
cd android && ./gradlew bundleRelease && cd ..
```

### Icon Not Showing

1. Verify icons exist in all mipmap folders
2. Clean build: `./gradlew clean`
3. Uninstall old app completely
4. Rebuild and reinstall

### Signing Issues

1. Verify keystore file path in gradle.properties
2. Check passwords are correct
3. Ensure keystore file exists
4. Regenerate if necessary (will require new package)

## ✅ Final Checklist

Before uploading to Play Store:

- [ ] App name is "UrbanEase Valet"
- [ ] App icon from icon.png is set
- [ ] Version code and name updated
- [ ] Release build tested on device
- [ ] All features working
- [ ] No debug logs in production
- [ ] Keystore backed up securely
- [ ] Store listing prepared
- [ ] Screenshots captured
- [ ] Privacy policy ready

## 🎉 You're Ready!

Your app is configured and ready for deployment with:
- ✅ App Name: **UrbanEase Valet**
- ✅ App Icon: **icon.png** (blue gradient UE logo)
- ✅ Package: **com.valletmobileapp**

Follow the build commands above to create your release build! 🚀
