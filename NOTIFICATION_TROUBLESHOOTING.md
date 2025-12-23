# 🔔 Notification Troubleshooting Guide

## ❌ Problem: Receiving Logs But No Visual Notifications

You're seeing logs like:
```
📬 Foreground Notification received
Title: ...
Body: ...
```

But **no notification appears on the device**.

## 🔍 Root Cause

Firebase Cloud Messaging (FCM) behaves differently based on app state:

| App State | Notification Display | Your Current Behavior |
|-----------|---------------------|----------------------|
| **Background** | ✅ Automatic | Should work |
| **Quit/Closed** | ✅ Automatic | Should work |
| **Foreground** | ❌ Manual Required | Only logs, no display |

## ✅ Solutions

### **Solution 1: Backend Configuration (RECOMMENDED)**

Your backend needs to send notifications with the correct configuration:

```javascript
// Backend code (Node.js with Firebase Admin SDK)
await admin.messaging().send({
  token: 'user_fcm_token',
  
  // ✅ IMPORTANT: Include notification object for auto-display
  notification: {
    title: 'New Job Request',
    body: 'Vehicle KA01AB1234 needs parking',
  },
  
  // Data payload (custom fields)
  data: {
    type: 'NEW_JOB',
    jobId: '12345',
    vehicleNumber: 'KA01AB1234',
  },
  
  // ✅ CRITICAL: Android configuration
  android: {
    priority: 'high',  // High priority for immediate delivery
    notification: {
      sound: 'default',
      channelId: 'default',
      priority: 'high',
      defaultSound: true,
      defaultVibrateTimings: true,
      defaultLightSettings: true,
    },
  },
  
  // ✅ iOS configuration
  apns: {
    payload: {
      aps: {
        alert: {
          title: 'New Job Request',
          body: 'Vehicle KA01AB1234 needs parking',
        },
        sound: 'default',
        badge: 1,
      },
    },
  },
});
```

### **Solution 2: Install Notifee for Foreground Notifications**

If you want to display custom notifications when app is in foreground:

#### **Step 1: Install Notifee**
```bash
npm install @notifee/react-native
cd android && ./gradlew clean && cd ..
```

#### **Step 2: I'll update the notification service**

Let me know if you want me to implement this solution.

### **Solution 3: Use Existing Banner (Current)**

Your app already shows a banner for `NEW_JOB` notifications in foreground (in `App.tsx`). This is working for job notifications but not for all notification types.

## 🧪 Testing Checklist

### **Test 1: Background Notifications**
1. Minimize the app (press home button)
2. Send notification from backend
3. ✅ Should see notification in notification tray
4. Tap notification
5. ✅ Should open app

### **Test 2: Quit State Notifications**
1. Close app completely (swipe away from recent apps)
2. Send notification from backend
3. ✅ Should see notification in notification tray
4. Tap notification
5. ✅ Should launch app

### **Test 3: Foreground Notifications**
1. Keep app open and active
2. Send notification from backend
3. ❌ Currently: Only logs, no visual notification
4. ✅ Expected: Should show notification or in-app banner

## 📊 Backend Notification Payload Examples

### **✅ CORRECT - Will Display Notification**
```json
{
  "token": "fcm_token_here",
  "notification": {
    "title": "New Job Request",
    "body": "Vehicle KA01AB1234 needs parking"
  },
  "data": {
    "type": "NEW_JOB",
    "jobId": "12345"
  },
  "android": {
    "priority": "high",
    "notification": {
      "sound": "default",
      "channelId": "default"
    }
  }
}
```

### **❌ WRONG - Only Logs, No Display**
```json
{
  "token": "fcm_token_here",
  "data": {
    "title": "New Job Request",
    "body": "Vehicle KA01AB1234 needs parking",
    "type": "NEW_JOB"
  }
}
```

**Problem**: Title and body are in `data` object, not `notification` object.

## 🔧 Quick Fix for Your Backend

Update your backend notification sending code:

### **Before (Not Working):**
```javascript
await admin.messaging().send({
  token: fcmToken,
  data: {
    title: 'Title',
    body: 'Message',
    // other data
  }
});
```

### **After (Working):**
```javascript
await admin.messaging().send({
  token: fcmToken,
  notification: {  // ← Add this
    title: 'Title',
    body: 'Message',
  },
  data: {
    // other data (no title/body here)
  },
  android: {  // ← Add this
    priority: 'high',
    notification: {
      sound: 'default',
      channelId: 'default',
    },
  },
});
```

## 🎯 Recommended Action

**Option A: Fix Backend (Easiest)**
1. Update your backend to send notifications with `notification` object
2. Add `android.priority: 'high'`
3. Test all three states (foreground, background, quit)

**Option B: Install Notifee (More Control)**
1. Install `@notifee/react-native`
2. I'll update the notification service to display foreground notifications
3. You'll have full control over notification appearance

## 📱 Device-Specific Issues

### **Android 13+**
- Requires `POST_NOTIFICATIONS` permission ✅ (Already added)
- Check: Settings → Apps → Your App → Notifications → Enabled

### **Android 8+**
- Requires notification channel
- Default channel is created automatically by Firebase
- Check: Settings → Apps → Your App → Notifications → Categories

### **Battery Optimization**
- Some devices (Xiaomi, Huawei, OnePlus) aggressively kill background apps
- Check: Settings → Battery → App Battery Usage → Your App → No restrictions

## 🔍 Debugging Steps

1. **Check Logs:**
   ```
   adb logcat | grep FCM
   ```

2. **Verify Token Registration:**
   ```
   Look for: "✅ FCM token registered with backend"
   ```

3. **Check Notification Received:**
   ```
   Look for: "📬 Foreground Notification received"
   ```

4. **Test with Firebase Console:**
   - Go to Firebase Console → Cloud Messaging
   - Send test message to your FCM token
   - Should work in background/quit state

## 💡 Summary

**Current Status:**
- ✅ FCM token registration working
- ✅ Backend receiving token
- ✅ Notifications arriving (logs show)
- ❌ Notifications not displaying visually

**Most Likely Cause:**
Your backend is sending **data-only messages** instead of **notification messages**.

**Quick Fix:**
Update backend to include `notification` object with `title` and `body`.

**Want me to implement Notifee for better foreground handling?**
Let me know and I'll add it!
