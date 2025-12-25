# Xcode Build Error Fix - BVLinearGradient Framework Not Found

## Issue
- Framework 'BVLinearGradient' not found
- Linker command failed with exit code 1

## Solution Steps

### Step 1: Close Xcode Completely
1. Quit Xcode (Cmd + Q)
2. Make sure it's fully closed

### Step 2: Clean Derived Data
```bash
cd ios
rm -rf ~/Library/Developer/Xcode/DerivedData/valletMobileApp*
```

### Step 3: Clean Build Folder
```bash
rm -rf build
```

### Step 4: Reinstall Pods (Already Done)
```bash
pod deintegrate
pod install
```

### Step 5: Open Workspace (NOT .xcodeproj)
**IMPORTANT:** Always open the `.xcworkspace` file, NOT the `.xcodeproj` file
```bash
open valletMobileApp.xcworkspace
```

### Step 6: In Xcode - Clean Build Folder
1. In Xcode menu: Product → Clean Build Folder (Cmd + Shift + K)
2. Wait for it to complete

### Step 7: Build the Project
1. Select your target device (iPhone simulator or your physical iPhone)
2. Product → Build (Cmd + B)

## If Still Not Working

### Option A: Reset Xcode Package Cache
```bash
rm -rf ~/Library/Developer/Xcode/DerivedData
rm -rf ~/Library/Caches/CocoaPods
```

Then repeat steps 4-7

### Option B: Check Build Settings in Xcode
1. Select the project in Xcode
2. Select the target "valletMobileApp"
3. Go to "Build Settings" tab
4. Search for "Framework Search Paths"
5. Make sure it includes:
   - `$(inherited)`
   - `"${PODS_CONFIGURATION_BUILD_DIR}/BVLinearGradient"`

### Option C: Manual Framework Link (Last Resort)
1. In Xcode, select the project
2. Select the target "valletMobileApp"
3. Go to "Build Phases" tab
4. Expand "Link Binary With Libraries"
5. Click the "+" button
6. Search for "BVLinearGradient"
7. Add it if not present

## Quick Command Sequence

Run these commands in order:
```bash
# Navigate to iOS directory
cd ios

# Clean everything
rm -rf build Pods Podfile.lock
rm -rf ~/Library/Developer/Xcode/DerivedData/valletMobileApp*

# Reinstall pods
pod install

# Open workspace
open valletMobileApp.xcworkspace
```

Then in Xcode:
1. Clean Build Folder (Cmd + Shift + K)
2. Build (Cmd + B)

## Why This Happens

The BVLinearGradient framework issue typically occurs when:
1. Xcode is caching old build artifacts
2. The workspace file is not being used (using .xcodeproj instead)
3. Pods were not properly linked after installation
4. Derived Data is corrupted

## Verification

After successful build, you should see:
- ✅ Build Succeeded message
- ✅ No red errors in the issue navigator
- ✅ App runs on simulator or device

## Still Having Issues?

Try building from command line to see detailed errors:
```bash
cd ios
xcodebuild -workspace valletMobileApp.xcworkspace \
  -scheme valletMobileApp \
  -configuration Debug \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  clean build
```
