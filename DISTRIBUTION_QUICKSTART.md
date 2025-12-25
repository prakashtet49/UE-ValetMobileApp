# Firebase App Distribution - Quick Start Guide

## ✅ Setup Complete!

Firebase CLI is authenticated and ready to use.
- **Logged in as:** harshavardhankuthadi06@gmail.com
- **Firebase Project:** valetmobileapp-6f619
- **Project Number:** 556469915246

## 📋 Next Steps to Distribute Your App

### Step 1: Get Your Firebase App IDs

You need to get your Android and iOS App IDs from Firebase Console:

1. **Go to Firebase Console:**
   https://console.firebase.google.com/project/valetmobileapp-6f619/settings/general

2. **Find Your App IDs:**
   - Scroll to "Your apps" section
   - **Android App ID** will look like: `1:556469915246:android:xxxxxxxxxxxxx`
   - **iOS App ID** will look like: `1:556469915246:ios:xxxxxxxxxxxxx`

3. **Update Distribution Scripts:**
   - Edit `distribute-android.sh` and replace `YOUR_ANDROID_APP_ID` with your actual Android App ID
   - Edit `distribute-ios.sh` and replace `YOUR_IOS_APP_ID` with your actual iOS App ID

### Step 2: Create Tester Groups in Firebase Console

1. **Go to App Distribution:**
   https://console.firebase.google.com/project/valetmobileapp-6f619/appdistribution

2. **Click "Testers & Groups" tab**

3. **Create a new group:**
   - Click "Add Group"
   - Name: `internal-testers`
   - Click "Create"

4. **Add team members:**
   - Click on the group
   - Click "Add Testers"
   - Enter email addresses of your team members
   - Click "Add"

### Step 3: Distribute Android App

```bash
# Run the distribution script
./distribute-android.sh
```

This will:
- Clean previous builds
- Build release APK
- Ask for release notes
- Upload to Firebase App Distribution
- Send email invitations to testers

**Manual command (if script doesn't work):**
```bash
cd android && ./gradlew assembleRelease && cd ..
firebase appdistribution:distribute \
  android/app/build/outputs/apk/release/app-release.apk \
  --app 1:556469915246:android:YOUR_APP_ID \
  --groups "internal-testers" \
  --release-notes "Latest build"
```

### Step 4: Distribute iOS App

**First, build the IPA in Xcode:**
1. Open `ios/valletMobileApp.xcworkspace` in Xcode
2. Select "Any iOS Device" as target
3. Product → Archive
4. Click "Distribute App"
5. Select "Ad Hoc" or "Development"
6. Export and save the IPA file

**Then run the distribution script:**
```bash
./distribute-ios.sh
```

**Manual command (if script doesn't work):**
```bash
firebase appdistribution:distribute path/to/YourApp.ipa \
  --app 1:556469915246:ios:YOUR_IOS_APP_ID \
  --groups "internal-testers" \
  --release-notes "Latest iOS build"
```

## 📱 How Team Members Install the App

### Android Installation
1. Team member receives email from Firebase App Distribution
2. Click the link in email (opens in browser)
3. Click "Download" button
4. If prompted, enable "Install from Unknown Sources"
5. Install and open the app

### iOS Installation
1. Team member receives email from Firebase App Distribution
2. Open the link **on their iOS device**
3. Follow the installation prompts
4. After installation, go to:
   - Settings → General → VPN & Device Management
   - Tap on the developer profile
   - Tap "Trust"
5. Open the app

## 🔧 Useful Commands

```bash
# List all Firebase projects
firebase projects:list

# List testers in a group
firebase appdistribution:testers:list --group internal-testers

# Add testers via CLI
firebase appdistribution:testers:add \
  email1@example.com email2@example.com \
  --group internal-testers

# View distribution history
firebase appdistribution:distributions:list \
  --app YOUR_APP_ID

# Remove a tester
firebase appdistribution:testers:remove email@example.com
```

## 📊 Monitor Distributions

**View in Firebase Console:**
https://console.firebase.google.com/project/valetmobileapp-6f619/appdistribution

You can see:
- Number of downloads
- Active testers
- Distribution history
- Crash reports (if enabled)

## 🎯 Best Practices

### Version Management
- Update version in `android/app/build.gradle` (versionName)
- Update version in `ios/valletMobileApp/Info.plist` (CFBundleShortVersionString)
- Use semantic versioning: 1.0.0, 1.0.1, 1.1.0, etc.

### Release Notes Template
```
Version: 1.0.5
Date: 2024-12-23

New Features:
- Added profile screen
- Implemented offline mode

Bug Fixes:
- Fixed login session timeout
- Corrected notification handling

Known Issues:
- None

Testing Focus:
- Test profile editing
- Verify offline functionality
```

### Distribution Frequency
- **Daily builds:** For active development
- **Weekly builds:** For stable testing
- **Release candidates:** Before production

## 🚨 Troubleshooting

### "App not installed" (Android)
```bash
# Rebuild with clean
cd android
./gradlew clean
./gradlew assembleRelease
cd ..
```

### "Distribution failed"
```bash
# Re-authenticate
firebase logout
firebase login

# Verify project
firebase projects:list
```

### "Invalid App ID"
- Double-check App ID from Firebase Console
- Ensure format is: `1:556469915246:android:xxxxx` or `1:556469915246:ios:xxxxx`

## 📞 Support

- **Firebase Documentation:** https://firebase.google.com/docs/app-distribution
- **Firebase Console:** https://console.firebase.google.com/project/valetmobileapp-6f619
- **React Native Firebase:** https://rnfirebase.io/

## ✨ Quick Reference

| Task | Command |
|------|---------|
| Distribute Android | `./distribute-android.sh` |
| Distribute iOS | `./distribute-ios.sh` |
| Add testers | Firebase Console → App Distribution → Testers & Groups |
| View downloads | Firebase Console → App Distribution |
| Build Android APK | `cd android && ./gradlew assembleRelease` |
| Build iOS IPA | Xcode → Product → Archive |

---

**Ready to distribute!** 🚀

Start with Step 1: Get your Firebase App IDs from the console.
