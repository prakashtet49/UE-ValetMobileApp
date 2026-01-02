import messaging from '@react-native-firebase/messaging';
import {Platform, PermissionsAndroid} from 'react-native';
import {registerFCMToken} from '../api/fcm';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, {AndroidImportance} from '@notifee/react-native';

const FCM_TOKEN_KEY = 'urbanease.fcmToken';
const NOTIFICATION_CHANNEL_ID = 'urbanease_sound_v3';

/**
 * Create Android notification channel
 */
async function createNotificationChannel() {
  if (Platform.OS === 'android') {
    console.log('[CHANNEL] Creating notification channel...');
    
    // Get all existing channels
    const channels = await notifee.getChannels();
    console.log('[CHANNEL] Existing channels:', channels.map(c => c.id));
    
    // Delete old channels if they exist
    const oldChannels = ['default', 'urbanease_custom_sound_v1', 'urbanease_sound_v2'];
    for (const channelId of oldChannels) {
      try {
        await notifee.deleteChannel(channelId);
        console.log(`[CHANNEL] 🗑️ Deleted old channel: ${channelId}`);
      } catch (error) {
        // Channel might not exist, ignore error
      }
    }
    
    // Check if current channel exists
    const existingChannel = channels.find(c => c.id === NOTIFICATION_CHANNEL_ID);
    if (existingChannel) {
      console.log('[CHANNEL] ⚠️ Channel already exists:', existingChannel);
      console.log('[CHANNEL] Current sound:', existingChannel.sound);
    }
    
    const channelConfig = {
      id: NOTIFICATION_CHANNEL_ID,
      name: 'UrbanEase Notifications',
      importance: AndroidImportance.HIGH,
      sound: 'sound',
      vibration: true,
      vibrationPattern: [300, 500],
      lights: true,
      lightColor: '#3156D8',
    };
    
    console.log('[CHANNEL] Creating channel with config:', channelConfig);
    await notifee.createChannel(channelConfig);
    
    // Verify channel was created
    const verifyChannels = await notifee.getChannels();
    const createdChannel = verifyChannels.find(c => c.id === NOTIFICATION_CHANNEL_ID);
    console.log('[CHANNEL] ✅ Channel created successfully');
    console.log('[CHANNEL] Verified channel:', createdChannel);
    console.log('[CHANNEL] Sound setting:', createdChannel?.sound);
  }
}

/**
 * Display local notification
 */
export async function displayNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
) {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[NOTIFICATION] Displaying notification...');
    console.log('[NOTIFICATION] Title:', title);
    console.log('[NOTIFICATION] Body:', body);
    console.log('[NOTIFICATION] Data:', data);
    
    await createNotificationChannel();
    
    const notificationId = await notifee.displayNotification({
      title,
      body,
      data,
      android: {
        channelId: NOTIFICATION_CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        smallIcon: 'ic_launcher',
        color: '#3156D8',
        pressAction: {
          id: 'default',
        },
      },
      ios: {
        sound: 'default',
      },
    });
    
    console.log('[NOTIFICATION] ✅ Notification displayed with ID:', notificationId);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('[NOTIFICATION] ❌ Error displaying notification:', error);
    console.error('[NOTIFICATION] Error details:', JSON.stringify(error));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
}

/**
 * Request notification permissions (required for iOS 10+)
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      
      if (enabled) {
        console.log('✅ iOS Notification permission granted:', authStatus);
      } else {
        console.log('❌ iOS Notification permission denied');
      }
      
      return enabled;
    } else if (Platform.OS === 'android') {
      // Android 13+ requires runtime permission
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        const enabled = granted === PermissionsAndroid.RESULTS.GRANTED;
        
        if (enabled) {
          console.log('✅ Android Notification permission granted');
        } else {
          console.log('❌ Android Notification permission denied');
        }
        
        return enabled;
      }
      // Android 12 and below don't need runtime permission
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Get FCM token and register it with backend
 */
export async function initializeFCM(): Promise<string | null> {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[FCM INIT] Starting FCM initialization...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Request permission first
    console.log('[FCM INIT] Step 1: Requesting notification permission...');
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log('[FCM INIT] ❌ Notification permission not granted');
      return null;
    }
    console.log('[FCM INIT] ✅ Notification permission granted');

    // Get FCM token
    console.log('[FCM INIT] Step 2: Getting FCM token from Firebase...');
    const fcmToken = await messaging().getToken();
    console.log('[FCM INIT] ✅ FCM Token obtained:', fcmToken.substring(0, 20) + '...');
    console.log('[FCM INIT] Full token:', fcmToken);

    // Store token locally
    console.log('[FCM INIT] Step 3: Storing token locally...');
    await AsyncStorage.setItem(FCM_TOKEN_KEY, fcmToken);
    console.log('[FCM INIT] ✅ Token stored in AsyncStorage');

    // Register token with backend
    console.log('[FCM INIT] Step 4: Registering token with backend...');
    try {
      await registerFCMToken(fcmToken);
      console.log('[FCM INIT] ✅ FCM token registered with backend successfully');
    } catch (error) {
      console.error('[FCM INIT] ❌ Failed to register FCM token with backend:', error);
      // Don't throw - token is still valid locally
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[FCM INIT] ✅ FCM initialization completed successfully');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return fcmToken;
  } catch (error: any) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('[FCM INIT] ❌ Error during FCM initialization');
    console.error('[FCM INIT] Error details:', error);
    console.error('[FCM INIT] Error message:', error?.message);
    console.error('[FCM INIT] Error stack:', error?.stack);
    
    // Check if it's a SERVICE_NOT_AVAILABLE error (common in emulators)
    if (error?.message?.includes('SERVICE_NOT_AVAILABLE')) {
      console.log('[FCM INIT] ⚠️ FCM not available (emulator or no Google Play Services)');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return null;
  }
}

/**
 * Get stored FCM token
 */
export async function getStoredFCMToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(FCM_TOKEN_KEY);
  } catch (error) {
    console.error('❌ Error getting stored FCM token:', error);
    return null;
  }
}

/**
 * Clear stored FCM token
 */
export async function clearFCMToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(FCM_TOKEN_KEY);
    await messaging().deleteToken();
    console.log('✅ FCM token cleared');
  } catch (error) {
    console.error('❌ Error clearing FCM token:', error);
  }
}

/**
 * Setup notification listeners
 */
export function setupNotificationListeners() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('[LISTENERS] Setting up notification listeners...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Handle notification when app is in foreground
  const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[FOREGROUND] 📬 Notification received while app is open!');
    console.log('[FOREGROUND] Full message:', JSON.stringify(remoteMessage, null, 2));
    
    // Display local notification when app is in foreground
    if (remoteMessage.notification) {
      const title = remoteMessage.notification.title || 'Notification';
      const body = remoteMessage.notification.body || '';
      
      console.log('[FOREGROUND] Notification title:', title);
      console.log('[FOREGROUND] Notification body:', body);
      
      // Display the notification
      await displayNotification(title, body, remoteMessage.data);
    } else {
      console.log('[FOREGROUND] ⚠️ No notification payload found');
    }
    
    if (remoteMessage.data) {
      console.log('[FOREGROUND] Data payload:', remoteMessage.data);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  });
  
  console.log('[LISTENERS] ✅ Foreground listener registered');

  // Handle notification when app is in background and user taps on it
  const unsubscribeBackground = messaging().onNotificationOpenedApp(remoteMessage => {
    console.log('📬 Background Notification opened:', remoteMessage);
    
    // Navigate to specific screen based on notification data
    if (remoteMessage.data) {
      console.log('Navigation data:', remoteMessage.data);
      // TODO: Add navigation logic based on remoteMessage.data
    }
  });

  // Handle notification when app was completely closed and user taps on it
  messaging()
    .getInitialNotification()
    .then(remoteMessage => {
      if (remoteMessage) {
        console.log('📬 Notification caused app to open from quit state:', remoteMessage);
        
        // Navigate to specific screen based on notification data
        if (remoteMessage.data) {
          console.log('Navigation data:', remoteMessage.data);
          // TODO: Add navigation logic based on remoteMessage.data
        }
      }
    });

  // Handle token refresh
  const unsubscribeTokenRefresh = messaging().onTokenRefresh(async token => {
    console.log('🔄 FCM Token refreshed:', token.substring(0, 20) + '...');
    
    // Store new token
    await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
    
    // Register new token with backend
    try {
      await registerFCMToken(token);
      console.log('✅ New FCM token registered with backend');
    } catch (error) {
      console.error('❌ Failed to register new FCM token with backend:', error);
    }
  });

  // Return cleanup function
  return () => {
    unsubscribeForeground();
    unsubscribeBackground();
    unsubscribeTokenRefresh();
  };
}

/**
 * Handle background messages (must be outside of component)
 */
export function setupBackgroundMessageHandler() {
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('📬 Background Message received:', remoteMessage);
    
    // Process the notification in background
    if (remoteMessage.data) {
      console.log('Background data:', remoteMessage.data);
      // You can update local storage, trigger local notifications, etc.
    }
  });
}

/**
 * Test function to manually trigger a notification
 * Call this from anywhere to test if notifications are working
 */
export async function testNotification() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('[TEST] Triggering test notification...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  await displayNotification(
    'Test Notification',
    'This is a test notification to verify the notification system is working correctly.',
    { test: 'true', timestamp: new Date().toISOString() }
  );
  
  console.log('[TEST] Test notification triggered');
}
