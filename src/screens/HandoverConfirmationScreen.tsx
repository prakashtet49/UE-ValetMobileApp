import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {AppStackParamList} from '../navigation/AppNavigator';
import {getPickupJobDetails, updatePickupStatus} from '../api/pickup';
import {sendDeliveredFeedback} from '../api/whatsapp';

type HandoverRouteProp = RouteProp<AppStackParamList, 'HandoverConfirmation'>;

export default function HandoverConfirmationScreen() {
  const route = useRoute<HandoverRouteProp>();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const {pickupJobId} = route.params;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const complete = async () => {
      try {
        let jobDetails: any | null = null;
        try {
          console.log(
            '[HandoverConfirmation] Fetching pickup job details',
            {pickupJobId},
          );
          jobDetails = await getPickupJobDetails(pickupJobId);
          console.log(
            '[HandoverConfirmation] Pickup job details for WhatsApp',
            jobDetails,
          );
        } catch (detailsError) {
          console.error(
            '[HandoverConfirmation] Failed to fetch pickup job details',
            detailsError,
          );
        }

        console.log('[HandoverConfirmation] Marking delivered', {pickupJobId});
        await updatePickupStatus({pickupJobId, status: 'DELIVERED'});

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
            console.log(
              '[HandoverConfirmation] Sending WhatsApp delivered feedback',
              {bookingId, customerPhone, vehicleNumber},
            );
            try {
              await sendDeliveredFeedback({
                bookingId,
                customerPhone,
                vehicleNumber,
              });
            } catch (waError) {
              console.error(
                '[HandoverConfirmation] Failed to send WhatsApp delivered feedback',
                waError,
              );
            }
          } else {
            console.log(
              '[HandoverConfirmation] Skipping WhatsApp delivered feedback, missing fields',
            );
          }
        } else {
          console.log(
            '[HandoverConfirmation] Skipping WhatsApp delivered feedback, no jobDetails',
          );
        }
        if (!cancelled) {
          setLoading(false);
        }
      } catch (e) {
        console.error('[HandoverConfirmation] Failed to mark delivered', e);
        if (!cancelled) {
          setError('Failed to update job status.');
          setLoading(false);
        }
      }
    };
    complete();
    return () => {
      cancelled = true;
    };
  }, [pickupJobId]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {loading ? (
          <View style={styles.centerRow}>
            <ActivityIndicator size="small" color="#a5b4fc" />
            <Text style={styles.loadingText}>Finalising handover...</Text>
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <>
            <Text style={styles.title}>Handover completed</Text>
            <Text style={styles.subtitle}>
              This job has been marked as delivered. Thank you for completing the
              handover.
            </Text>
          </>
        )}

        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('PendingPickups')}>
            <Text style={styles.secondaryButtonText}>Back to pickups</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Home')}>
            <Text style={styles.primaryButtonText}>Back to home</Text>
          </TouchableOpacity>
        </View>
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
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    marginLeft: 8,
    color: '#e5e7eb',
    fontSize: 14,
  },
  errorText: {
    color: '#fecaca',
    fontSize: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f9fafb',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 20,
  },
  buttonsRow: {
    flexDirection: 'row',
    marginTop: 16,
    justifyContent: 'space-between',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4b5563',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '500',
  },
  primaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#f9fafb',
    fontSize: 14,
    fontWeight: '600',
  },
});
