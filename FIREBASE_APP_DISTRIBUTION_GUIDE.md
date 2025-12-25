# Firebase App Distribution Setup Guide

## Overview
Firebase App Distribution allows you to distribute your app to internal team members for testing without going through the App Store or Play Store.

## Prerequisites
- Firebase project set up (✅ Already done)
- Firebase CLI installed (✅ Already done)
- Google account with Firebase access

## For Android Distribution

### 1. Build Release APK
```bash
cd android
./gradlew assembleRelease
```
The APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

### 2. Distribute via Firebase CLI
```bash
firebase appdistribution:distribute android/app/build/outputs/apk/release/app-release.apk \
  --app YOUR_FIREBASE_APP_ID \
  --groups "internal-testers" \
  --release-notes "Latest version with all features"
```

### 3. Team Members Installation (Android)
1. Team members receive email invitation
2. Click the link in email
3. Download and install the APK
4. Enable "Install from Unknown Sources" if prompted

## For iOS Distribution

### 1. Requirements
- Apple Developer Account (Free or Paid)
- Ad-Hoc or Development provisioning profile
- Team members' device UDIDs registered

### 2. Build iOS Archive in Xcode
1. Open `ios/valletMobileApp.xcworkspace` in Xcode
2. Select "Any iOS Device" as target
3. Product → Archive
4. Export as Ad-Hoc or Development

### 3. Distribute via Firebase CLI
```bash
firebase appdistribution:distribute path/to/YourApp.ipa \
  --app YOUR_FIREBASE_IOS_APP_ID \
  --groups "internal-testers" \
  --release-notes "Latest iOS build"
```

### 4. Team Members Installation (iOS)
1. Team members receive email invitation
2. Open link on iOS device
3. Install the profile
4. Trust the developer certificate in Settings

## Setting Up Tester Groups

### Via Firebase Console
1. Go to https://console.firebase.google.com
2. Select your project: `valetmobileapp-6f619`
3. Go to "App Distribution" in left menu
4. Click "Testers & Groups"
5. Create a group: "internal-testers"
6. Add team members' emails

### Via CLI
```bash
# Add testers to a group
firebase appdistribution:testers:add \
  email1@example.com email2@example.com \
  --group internal-testers
```

## Automated Distribution Scripts

### Android Distribution Script
Create `distribute-android.sh`:
```bash
#!/bin/bash
echo "Building Android Release APK..."
cd android
./gradlew assembleRelease
cd ..

echo "Distributing to Firebase..."
firebase appdistribution:distribute \
  android/app/build/outputs/apk/release/app-release.apk \
  --app 1:556469915246:android:YOUR_APP_ID \
  --groups "internal-testers" \
  --release-notes "Build $(date +%Y-%m-%d)"

echo "Distribution complete!"
```

### iOS Distribution Script
Create `distribute-ios.sh`:
```bash
#!/bin/bash
echo "Please build and export IPA from Xcode first"
echo "Then run: firebase appdistribution:distribute path/to/app.ipa --app YOUR_IOS_APP_ID --groups internal-testers"
```

## Finding Your Firebase App IDs

### Android App ID
1. Go to Firebase Console
2. Project Settings → General
3. Under "Your apps" → Android app
4. Copy the "App ID" (format: `1:556469915246:android:xxxxx`)

### iOS App ID
1. Same location in Firebase Console
2. Under "Your apps" → iOS app
3. Copy the "App ID" (format: `1:556469915246:ios:xxxxx`)

## Best Practices

### Version Management
- Use semantic versioning (1.0.0, 1.0.1, etc.)
- Include build number in release notes
- Tag releases in Git

### Release Notes
Include in each distribution:
- New features added
- Bugs fixed
- Known issues
- Testing instructions

### Tester Groups
Organize by:
- **internal-testers**: Core team members
- **qa-team**: QA testers
- **stakeholders**: Management/clients

## Troubleshooting

### Android: "App not installed"
- Enable "Install from Unknown Sources"
- Check if previous version is installed (uninstall first)
- Verify APK is not corrupted

### iOS: "Untrusted Developer"
- Settings → General → VPN & Device Management
- Trust the developer profile

### Distribution Failed
- Check Firebase CLI is authenticated: `firebase login`
- Verify App ID is correct
- Ensure you have proper permissions in Firebase project

## Team Member Onboarding

### For Android Users
1. Send them invitation via Firebase Console
2. They receive email with download link
3. Click link on Android device
4. Enable unknown sources if needed
5. Install and launch app

### For iOS Users
1. Collect their device UDID
2. Add UDID to provisioning profile
3. Rebuild app with updated profile
4. Distribute via Firebase
5. They install profile and trust certificate

## Monitoring

### View Distribution Analytics
- Firebase Console → App Distribution
- See download counts
- Track active testers
- View crash reports (if Crashlytics enabled)

## Next Steps

1. ✅ Authenticate Firebase CLI
2. Build release APK/IPA
3. Get Firebase App IDs from console
4. Create tester groups
5. Distribute first build
6. Invite team members
7. Collect feedback

## Useful Commands

```bash
# Login to Firebase
firebase login

# List all projects
firebase projects:list

# Set active project
firebase use valetmobileapp-6f619

# List testers
firebase appdistribution:testers:list

# Remove tester
firebase appdistribution:testers:remove email@example.com

# View distribution history
firebase appdistribution:distributions:list --app YOUR_APP_ID
```

## Support
- Firebase Documentation: https://firebase.google.com/docs/app-distribution
- React Native Firebase: https://rnfirebase.io/
