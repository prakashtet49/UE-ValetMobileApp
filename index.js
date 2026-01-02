/**
 * @format
 */

import 'react-native-gesture-handler';
import {AppRegistry} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import {name as appName} from './app.json';

console.log('[ENTRY] index.js loaded');

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[FCM] Background message handler fired', remoteMessage);
  
  // Display custom notification with our sound and icon
  if (remoteMessage.notification) {
    const {displayNotification} = require('./src/services/notificationService');
    await displayNotification(
      remoteMessage.notification.title || 'Notification',
      remoteMessage.notification.body || '',
      remoteMessage.data
    );
  }
  
  // Navigation for new jobs is handled when the user taps the notification
  // and the app is brought to foreground (see App.tsx handlers).
});

console.log('[ENTRY] Registering root component');
AppRegistry.registerComponent(appName, () => App);
