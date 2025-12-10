import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {RouteProp, useRoute, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {AppStackParamList} from '../navigation/AppNavigator';
import {getPickupJobDetails, updatePickupStatus} from '../api/pickup';
import {sendDriverArriving} from '../api/whatsapp';

type DriveToPickupRouteProp = RouteProp<AppStackParamList, 'DriveToPickup'>;

export default function DriveToPickupScreen() {
  const route = useRoute<DriveToPickupRouteProp>();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const {pickupJobId} = route.params;

  const [started, setStarted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [updating, setUpdating] = useState(false);
  const [jobDetails, setJobDetails] = useState<any | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      try {
        setUpdating(true);
        console.log('[DriveToPickup] Marking pickup started', {pickupJobId});
        await updatePickupStatus({pickupJobId, status: 'PICKUP_STARTED'});
        try {
          console.log('[DriveToPickup] Fetching pickup job details', {pickupJobId});
          const details = await getPickupJobDetails(pickupJobId);
          if (!cancelled) {
            console.log('[DriveToPickup] Pickup job details', details);
            setJobDetails(details);
          }
        } catch (detailsError) {
          console.error(
            '[DriveToPickup] Failed to fetch pickup job details',
            detailsError,
          );
        }
        if (!cancelled) {
          setStarted(true);
        }
      } catch (error) {
        console.error('[DriveToPickup] Failed to mark pickup started', error);
      } finally {
        if (!cancelled) {
          setUpdating(false);
        }
      }
    };

    start();

    return () => {
      cancelled = true;
    };
  }, [pickupJobId]);

  useEffect(() => {
    if (!started) {
      return;
    }
    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [started]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${m}m ${ss.toString().padStart(2, '0')}s`;
  };

  const handleArrived = async () => {
    try {
      if (jobDetails) {
        const bookingId =
          (jobDetails as any).bookingId || (jobDetails as any).booking?.id;
        const customerPhone =
          (jobDetails as any).customerPhone ||
          (jobDetails as any).customer?.phone;
        const vehicleNumber =
          (jobDetails as any).vehicleNumber ||
          (jobDetails as any).vehicle?.number;

        if (bookingId && customerPhone && vehicleNumber) {
          console.log('[DriveToPickup] Sending WhatsApp driver arriving', {
            bookingId,
            customerPhone,
            vehicleNumber,
          });
          try {
            await sendDriverArriving({
              bookingId,
              customerPhone,
              vehicleNumber,
              etaMinutes: undefined,
            });
          } catch (waError) {
            console.error(
              '[DriveToPickup] Failed to send WhatsApp driver arriving',
              waError,
            );
          }
        } else {
          console.log(
            '[DriveToPickup] Skipping WhatsApp driver arriving, missing fields',
          );
        }
      } else {
        console.log(
          '[DriveToPickup] Skipping WhatsApp driver arriving, no jobDetails',
        );
      }
    } finally {
      navigation.navigate('VerifyReference', {pickupJobId});
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>On the way to pickup point</Text>
        <Text style={styles.subtitle}>
          Drive to the guest&apos;s pickup location and then confirm arrival.
        </Text>

        <View style={styles.timerBlock}>
          <Text style={styles.timerLabel}>Time since starting</Text>
          {started ? (
            <Text style={styles.timerValue}>{formatDuration(seconds)}</Text>
          ) : (
            <View style={styles.timerLoadingRow}>
              <ActivityIndicator size="small" color="#a5b4fc" />
              <Text style={styles.timerLoadingText}>Starting pickup...</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleArrived}
          disabled={updating || !started}>
          <Text style={styles.primaryButtonText}>Arrived at pickup point</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050816',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#020617',
    padding: 20,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f9fafb',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 20,
  },
  timerBlock: {
    marginBottom: 20,
  },
  timerLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  timerValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#e5e7eb',
  },
  timerLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerLoadingText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#e5e7eb',
  },
  primaryButton: {
    height: 46,
    borderRadius: 999,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#f9fafb',
    fontSize: 15,
    fontWeight: '600',
  },
});
