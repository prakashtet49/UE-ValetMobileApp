/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useEffect, useState} from 'react';
import {
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AuthProvider} from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import messaging from '@react-native-firebase/messaging';
import {handleJobNotification} from './src/notifications/jobNotifications';
import {navigate} from './src/navigation/navigationRef';
import { AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';

import {navigationRef} from './src/navigation/navigationRef';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [foregroundJob, setForegroundJob] = useState<
    | {
        jobId: string;
        vehicleNumber: string;
        tagNumber?: string;
        pickupPoint?: string;
      }
    | null
  >(null);

  useEffect(() => {
    console.log('[FCM] setup effect mounted');

    // App opened from background via notification tap
    const unsubscribeOpen = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('[FCM] Notification opened from background', remoteMessage);
      if (remoteMessage?.data) {
        handleJobNotification(remoteMessage.data);
      }
    });

    // App opened from quit state via notification tap
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        console.log('[FCM] getInitialNotification result', remoteMessage);
        if (remoteMessage?.data) {
          handleJobNotification(remoteMessage.data);
        }
      })
      .catch(error => {
        console.error('[FCM] getInitialNotification error', error);
      });

    // Foreground messages
    const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
      console.log('[FCM] Foreground message received', remoteMessage);
      const data = remoteMessage.data || {};
      if (data && data.type === 'NEW_JOB') {
        if (data.jobId && data.vehicleNumber) {
          setForegroundJob({
            jobId: String(data.jobId),
            vehicleNumber: String(data.vehicleNumber),
            tagNumber: data.tagNumber ? String(data.tagNumber) : undefined,
            pickupPoint: data.pickupPoint ? String(data.pickupPoint) : undefined,
          });
        }
      }
    });

    return () => {
      console.log('[FCM] cleanup subscriptions');
      unsubscribeOpen();
      unsubscribeForeground();
    };
  }, []);

  // Separate effect for FCM token logging
  useEffect(() => {
    console.log('[FCM] token effect mounted');

    const getTokenAsync = async () => {
      console.log('[FCM] getTokenAsync START');
      try {
        console.log('[FCM] requesting notification permission');
        const authStatus = await messaging().requestPermission();
        console.log('[FCM] requestPermission returned', authStatus);

        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        console.log('[FCM] computed enabled =', enabled);

        if (!enabled) {
          console.log('[FCM] permission not granted, skipping getToken');
          return;
        }

        console.log('[FCM] calling messaging().getToken() NOW');
        const token = await messaging().getToken();
        console.log('[FCM] Registration token VALUE:', token);
      } catch (error) {
        console.error('[FCM] getToken error CAUGHT:', error);
      } finally {
        console.log('[FCM] getTokenAsync END');
      }
    };

    getTokenAsync();
  }, []);

  const handleViewJob = () => {
    if (!foregroundJob) {
      return;
    }
    const {jobId, vehicleNumber, tagNumber, pickupPoint} = foregroundJob;
    navigate('NewJobRequest', {
      jobId,
      vehicleNumber,
      tagNumber,
      pickupPoint,
    });
    setForegroundJob(null);
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.container}>
        <AuthProvider>
          {foregroundJob ? (
            <View style={styles.bannerContainer}>
              <View style={styles.bannerCard}>
                <Text style={styles.bannerTitle}>New job request</Text>
                <Text style={styles.bannerText}>
                  {foregroundJob.vehicleNumber}
                  {foregroundJob.pickupPoint
                    ? ` b7 ${foregroundJob.pickupPoint}`
                    : ''}
                </Text>
                <View style={styles.bannerActionsRow}>
                  <TouchableOpacity
                    style={styles.bannerPrimaryButton}
                    onPress={handleViewJob}>
                    <Text style={styles.bannerPrimaryText}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.bannerSecondaryButton}
                    onPress={() => setForegroundJob(null)}>
                    <Text style={styles.bannerSecondaryText}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : null}
          <AppNavigator />
        </AuthProvider>
      </View>
    </SafeAreaProvider>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    alignItems: 'center',
    paddingTop: 8,
  },
  bannerCard: {
    width: '94%',
    borderRadius: 12,
    backgroundColor: '#111827',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 2,
  },
  bannerText: {
    fontSize: 12,
    color: '#e5e7eb',
    marginBottom: 8,
  },
  bannerActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  bannerPrimaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#4f46e5',
  },
  bannerPrimaryText: {
    color: '#f9fafb',
    fontSize: 12,
    fontWeight: '600',
  },
  bannerSecondaryButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  bannerSecondaryText: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default App;
