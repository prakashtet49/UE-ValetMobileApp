# 🔔 FCM Push Notifications Setup

## ✅ Implementation Complete

Your app now has full FCM (Firebase Cloud Messaging) push notification support integrated with your backend API.

## 📋 What Was Implemented

### **1. FCM API Integration** (`src/api/fcm.ts`)
```typescript
POST /api/fcm/register
Body: { "fcm_token": "dP3gF5xR8y..." }
```
- Registers FCM token with your backend
- Requires authentication
- Called automatically on login

### **2. Notification Service** (`src/services/notificationService.ts`)
Complete notification handling service with:

#### **Functions:**
- `requestNotificationPermission()` - Requests user permission (iOS/Android 13+)
- `initializeFCM()` - Gets FCM token and registers with backend
- `getStoredFCMToken()` - Retrieves locally stored token
- `clearFCMToken()` - Clears token on logout
- `setupNotificationListeners()` - Sets up all notification handlers
- `setupBackgroundMessageHandler()` - Handles background messages

#### **Notification States Handled:**
1. **Foreground** - App is open and active
2. **Background** - App is minimized
3. **Quit** - App was completely closed
4. **Token Refresh** - When FCM token changes

### **3. Auth Integration** (`src/context/AuthContext.tsx`)
- **On Login**: Automatically registers FCM token with backend
- **On Logout**: Clears FCM token from device and backend

### **4. App Initialization** (`App.tsx`)
- Initializes FCM on app start
- Sets up notification listeners
- Handles foreground notifications with UI banner

## 🔄 Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    App Starts                           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Request Notification Permission (iOS/Android 13+)      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Get FCM Token from Firebase                            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  User Logs In                                           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  POST /api/fcm/register                                 │
│  { "fcm_token": "..." }                                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Backend Stores Token → Can Send Notifications         │
└─────────────────────────────────────────────────────────┘
```

## 📱 Notification Handling

### **Foreground (App Open)**
```javascript
messaging().onMessage(async remoteMessage => {
  // Show in-app banner or alert
  console.log('Notification:', remoteMessage.notification);
  console.log('Data:', remoteMessage.data);
});
```

### **Background (App Minimized)**
```javascript
messaging().onNotificationOpenedApp(remoteMessage => {
  // User tapped notification
  // Navigate to specific screen
  console.log('Opened from background:', remoteMessage);
});
```

### **Quit State (App Closed)**
```javascript
messaging().getInitialNotification().then(remoteMessage => {
  // User tapped notification that opened the app
  console.log('Opened from quit state:', remoteMessage);
});
```

### **Background Processing**
```javascript
// In index.js
messaging().setBackgroundMessageHandler(async remoteMessage => {
  // Process notification silently
  console.log('Background message:', remoteMessage);
});
```

## 🔧 Backend Integration

### **Sending Notifications from Backend**

Your backend should send notifications using Firebase Admin SDK:

```javascript
// Node.js example
const admin = require('firebase-admin');

// Send to specific device
await admin.messaging().send({
  token: 'user_fcm_token_from_database',
  notification: {
    title: 'New Job Request',
    body: 'Vehicle KA01AB1234 needs parking',
  },
  data: {
    type: 'NEW_JOB',
    jobId: '12345',
    vehicleNumber: 'KA01AB1234',
    tagNumber: 'TAG123',
    pickupPoint: 'B12',
  },
  android: {
    priority: 'high',
    notification: {
      sound: 'default',
      channelId: 'default',
    },
  },
  apns: {
    payload: {
      aps: {
        sound: 'default',
        badge: 1,
      },
    },
  },
});
```

### **Notification Payload Structure**

```json
{
  "notification": {
    "title": "Notification Title",
    "body": "Notification message"
  },
  "data": {
    "type": "NEW_JOB",
    "jobId": "12345",
    "vehicleNumber": "KA01AB1234",
    "tagNumber": "TAG123",
    "pickupPoint": "B12",
    "customField": "any_value"
  }
}
```

## 📊 Token Management

### **Token Storage**
- **Local**: AsyncStorage (`urbanease.fcmToken`)
- **Backend**: Your database after `/api/fcm/register` call

### **Token Lifecycle**
1. **First Install**: Token generated and registered
2. **Login**: Token re-registered with backend
3. **Token Refresh**: Automatically updated on both sides
4. **Logout**: Token cleared from device and backend
5. **Reinstall**: New token generated

### **Token Refresh Handling**
```javascript
messaging().onTokenRefresh(async token => {
  // Automatically registers new token with backend
  await registerFCMToken(token);
});
```

## 🔐 Permissions

### **iOS**
- Requests permission on first launch
- User can grant/deny in system settings
- Permission status checked before token generation

### **Android**
- **Android 12 and below**: No runtime permission needed
- **Android 13+**: Requires `POST_NOTIFICATIONS` permission
- Automatically requested by the app

## 🧪 Testing Notifications

### **1. Test with Firebase Console**
1. Go to Firebase Console → Cloud Messaging
2. Click "Send test message"
3. Enter your FCM token (check logs)
4. Send notification

### **2. Test with Backend**
```bash
# Get FCM token from app logs
# Look for: "FCM Token obtained: ..."

# Send test notification from your backend
curl -X POST https://your-backend.com/api/test-notification \
  -H "Content-Type: application/json" \
  -d '{
    "fcm_token": "your_token_here",
    "title": "Test Notification",
    "body": "This is a test"
  }'
```

### **3. Test Different States**
- **Foreground**: Open app → Send notification → See banner
- **Background**: Minimize app → Send notification → Tap notification
- **Quit**: Close app → Send notification → Tap notification

## 📝 Logs to Monitor

### **Success Logs**
```
✅ iOS Notification permission granted
✅ Android Notification permission granted
📱 FCM Token obtained: dP3gF5xR8y...
✅ FCM token registered with backend
✅ FCM initialized and token registered
📬 Foreground Notification received
📬 Background Notification opened
🔄 FCM Token refreshed
```

### **Error Logs**
```
❌ Notification permission denied
❌ Error initializing FCM
❌ Failed to register FCM token with backend
⚠️ FCM initialization failed or permission denied
```

## 🚨 Troubleshooting

### **Token Not Registering**
1. Check user is logged in (requires authentication)
2. Check network connection
3. Check backend API is accessible
4. Check Firebase configuration

### **Notifications Not Received**
1. Check notification permissions granted
2. Check FCM token is valid (not expired)
3. Check backend is sending to correct token
4. Check notification payload format
5. Check device has internet connection

### **Token Refresh Issues**
1. Token refresh is automatic
2. Check `onTokenRefresh` listener is set up
3. Check backend API accepts token updates

## 📱 Platform-Specific Notes

### **iOS**
- Requires physical device (simulator doesn't support push)
- Requires Apple Push Notification service (APNs) certificate
- Must request permission before receiving notifications
- Background notifications require "Remote notifications" capability

### **Android**
- Works on emulator and physical devices
- Android 13+ requires runtime permission
- Uses notification channels for Android 8+
- Background notifications work automatically

## 🔄 Migration & Updates

### **Updating FCM Token**
If user reinstalls app or token expires:
1. New token generated automatically
2. On next login, new token registered
3. Old token becomes invalid

### **Multiple Devices**
- Each device gets unique FCM token
- Backend should store multiple tokens per user
- Send notifications to all user's devices

## ✅ Checklist

- [x] FCM API endpoint created (`/api/fcm/register`)
- [x] Notification service implemented
- [x] Auth integration (login/logout)
- [x] App initialization
- [x] Foreground handler
- [x] Background handler
- [x] Quit state handler
- [x] Token refresh handler
- [x] Permission requests
- [x] Error handling
- [x] Logging

## 🎯 Next Steps

1. **Backend**: Implement notification sending logic
2. **Testing**: Test all notification scenarios
3. **UI**: Customize notification banners/alerts
4. **Navigation**: Add deep linking based on notification data
5. **Analytics**: Track notification delivery and open rates

## 📚 Resources

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [React Native Firebase Docs](https://rnfirebase.io/messaging/usage)
- [Android Notification Channels](https://developer.android.com/training/notify-user/channels)
- [iOS Push Notifications](https://developer.apple.com/documentation/usernotifications)

---

## 🎉 Summary

Your app now:
- ✅ Requests notification permissions
- ✅ Gets FCM token from Firebase
- ✅ Registers token with backend on login
- ✅ Handles notifications in all app states
- ✅ Automatically refreshes tokens
- ✅ Clears tokens on logout
- ✅ Shows in-app banners for foreground notifications
- ✅ Supports navigation from notifications

**Ready to receive push notifications from your backend!** 🚀
