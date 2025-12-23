import messaging from '@react-native-firebase/messaging';
import {Platform, PermissionsAndroid} from 'react-native';
import {registerFCMToken} from '../api/fcm';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, {AndroidImportance} from '@notifee/react-native';

const FCM_TOKEN_KEY = 'urbanease.fcmToken';
const NOTIFICATION_CHANNEL_ID = 'default';

/**
 * Create Android notification channel
 */
async function createNotificationChannel() {
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: NOTIFICATION_CHANNEL_ID,
      name: 'Default',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });
    console.log('✅ Notification channel created');
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
    await createNotificationChannel();
    
    await notifee.displayNotification({
      title,
      body,
      data,
      android: {
        channelId: NOTIFICATION_CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        sound: 'default',
        pressAction: {
          id: 'default',
        },
      },
      ios: {
        sound: 'default',
      },
    });
    
    console.log('✅ Local notification displayed');
  } catch (error) {
    console.error('❌ Error displaying notification:', error);
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
    // Request permission first
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log('⚠️ Notification permission not granted');
      return null;
    }

    // Get FCM token
    const fcmToken = await messaging().getToken();
    console.log('📱 FCM Token obtained:', fcmToken.substring(0, 20) + '...');

    // Store token locally
    await AsyncStorage.setItem(FCM_TOKEN_KEY, fcmToken);

    // Register token with backend
    try {
      await registerFCMToken(fcmToken);
      console.log('✅ FCM token registered with backend');
    } catch (error) {
      console.error('❌ Failed to register FCM token with backend:', error);
      // Don't throw - token is still valid locally
    }

    return fcmToken;
  } catch (error: any) {
    // Check if it's a SERVICE_NOT_AVAILABLE error (common in emulators)
    if (error?.message?.includes('SERVICE_NOT_AVAILABLE')) {
      console.log('⚠️ FCM not available (emulator or no Google Play Services) - continuing without push notifications');
    } else {
      console.error('❌ Error initializing FCM:', error);
    }
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
  // Handle notification when app is in foreground
  const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
    console.log('📬 Foreground Notification received:', remoteMessage);
    
    // Display local notification when app is in foreground
    if (remoteMessage.notification) {
      const title = remoteMessage.notification.title || 'Notification';
      const body = remoteMessage.notification.body || '';
      
      console.log('Title:', title);
      console.log('Body:', body);
      
      // Display the notification
      await displayNotification(title, body, remoteMessage.data);
    }
    
    if (remoteMessage.data) {
      console.log('Data:', remoteMessage.data);
    }
  });

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
