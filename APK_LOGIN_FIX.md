# APK Login Issue - Fixed

## 🔴 Problem

When installing the APK on a real device, the "Continue with OTP" button doesn't work and login fails.

## 🎯 Root Cause

**Android blocks HTTP (cleartext) traffic by default in release builds** for security reasons. Since the app connects to `http://13.50.218.71:80` (HTTP, not HTTPS), the network requests were being blocked.

## ✅ Fixes Applied

### Fix 1: Network Security Configuration

Created `/android/app/src/main/res/xml/network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Allow cleartext traffic for development server -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">13.50.218.71</domain>
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">10.0.2.2</domain>
        <domain includeSubdomains="true">10.0.3.2</domain>
    </domain-config>
</network-security-config>
```

This allows HTTP traffic to the backend server.

### Fix 2: Updated AndroidManifest.xml

Added network security config reference:

```xml
<application
  ...
  android:networkSecurityConfig="@xml/network_security_config"
  ...>
```

### Fix 3: Better Error Handling

Enhanced LoginScreen with:
- ✅ Phone number validation
- ✅ Clear error messages via Alert dialogs
- ✅ Network error detection
- ✅ Console logging for debugging

## 🔧 How to Build New APK

### Step 1: Clean Build
```bash
cd android
./gradlew clean
cd ..
```

### Step 2: Build Release APK
```bash
cd android
./gradlew assembleRelease
```

### Step 3: Find APK
The APK will be at:
```
android/app/build/outputs/apk/release/app-release.apk
```

### Step 4: Install on Device
```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

Or manually copy the APK to your device and install it.

## 🧪 Testing

### Test 1: Button Responsiveness
1. Open the app
2. Enter a phone number
3. Tap "Continue with OTP"
4. **Expected**: Button shows "Sending OTP..." and then navigates to OTP screen
5. **If fails**: Alert dialog shows specific error message

### Test 2: Network Connectivity
1. Ensure device has internet connection
2. Try to login
3. **If network error**: Alert shows "Network error. Please check your internet connection."

### Test 3: Server Connectivity
1. Ensure backend server is running at `http://13.50.218.71:80`
2. Test from device browser: `http://13.50.218.71:80/api/health` (if health endpoint exists)
3. Try login
4. **If server error**: Alert shows "Server error. Please try again later."

## 📊 Error Messages

The app now shows specific error messages:

| Error Type | Message |
|------------|---------|
| Empty phone | "Please enter your phone number" |
| Invalid phone | "Please enter a valid phone number" |
| Network error | "Network error. Please check your internet connection." |
| Server error (500) | "Server error. Please try again later." |
| Service not found (404) | "Service not available. Please contact support." |
| Other errors | "Failed to send OTP. Please try again." |

## 🔍 Debugging

### Check Logs
After installing APK, connect device via USB and run:
```bash
adb logcat | grep -E "LoginScreen|sendOtp|API"
```

You should see:
```
[LoginScreen] Sending OTP to: +1234567890
[API REQUEST] url: http://13.50.218.71:80/api/auth/send-otp
[API RESPONSE] status: 200
[LoginScreen] OTP sent successfully
```

### Common Issues

#### Issue 1: Still Can't Connect
**Symptom**: Network error even after fix

**Possible causes**:
1. Device not on same network as server
2. Server firewall blocking device IP
3. Server not running

**Solution**:
- Test server from device browser
- Check server logs for incoming requests
- Ensure server allows connections from device IP

#### Issue 2: Button Not Responding
**Symptom**: Button tap does nothing

**Possible causes**:
1. Phone number too short (< 10 digits)
2. App crashed (check logcat)

**Solution**:
- Enter valid phone number (10+ digits)
- Check logcat for crash logs
- Rebuild app

#### Issue 3: OTP Not Received
**Symptom**: Navigates to OTP screen but no OTP received

**This is a backend issue**, not related to the APK build. Check:
- Backend SMS service configuration
- Phone number format
- Backend logs for OTP generation

## ⚠️ Security Note

**Important**: The network security config allows HTTP traffic, which is **not secure** for production.

### For Production:
1. **Use HTTPS** instead of HTTP
2. Get SSL certificate for your server
3. Update `BASE_URL` to use `https://`
4. Remove or restrict network security config

### Current Setup (Development Only):
```
✅ Good for: Development, Testing
❌ Bad for: Production, Public Release
```

## 📝 Checklist

Before building APK:
- [x] Network security config created
- [x] AndroidManifest.xml updated
- [x] Error handling added to LoginScreen
- [x] Validation added for phone number
- [ ] Clean build performed
- [ ] Release APK built
- [ ] APK tested on real device
- [ ] Login flow works
- [ ] Error messages display correctly

## 🚀 Next Steps

1. **Build new APK** with the fixes
2. **Install on device**
3. **Test login flow**
4. **Check error messages** if login fails
5. **Share logs** if issues persist

## 💡 Quick Test

To quickly test if the fix works:

```bash
# Clean and build
cd android
./gradlew clean assembleRelease

# Install
adb install app/build/outputs/apk/release/app-release.apk

# Watch logs
adb logcat | grep -E "LoginScreen|API"

# Try to login from device
```

## 📞 Support

If login still doesn't work after applying these fixes:

1. **Check device logs**: `adb logcat | grep LoginScreen`
2. **Check server logs**: Verify server received the request
3. **Test server**: Try `curl http://13.50.218.71:80/api/auth/send-otp` from device
4. **Share error**: Copy the exact error message from Alert dialog

The fixes address the Android HTTP blocking issue and add proper error handling. The app should now work on real devices! 🎯
