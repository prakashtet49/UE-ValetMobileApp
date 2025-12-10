import React, {useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {AppStackParamList} from '../navigation/AppNavigator';
import {acceptJob, declineJob} from '../api/jobs';

export type NewJobRequestScreenProps = NativeStackScreenProps<
  AppStackParamList,
  'NewJobRequest'
>;

const DECLINE_REASONS = [
  'Busy with another job',
  'Not at location',
  'Break',
  'Other',
] as const;

export default function NewJobRequestScreen({
  route,
  navigation,
}: NewJobRequestScreenProps) {
  const {jobId, vehicleNumber, tagNumber, pickupPoint} = route.params;
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [showDeclineReasons, setShowDeclineReasons] = useState(false);
  const [selectedReason, setSelectedReason] = useState<
    (typeof DECLINE_REASONS)[number] | null
  >(null);

  const handleAccept = async () => {
    try {
      setIsAccepting(true);
      console.log('[NewJobRequest] Accepting job', {jobId});
      await acceptJob(jobId);
      navigation.goBack();
    } catch (error) {
      console.error('[NewJobRequest] Failed to accept job', error);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!showDeclineReasons) {
      setShowDeclineReasons(true);
      return;
    }
    if (!selectedReason) {
      return;
    }

    try {
      setIsDeclining(true);
      console.log('[NewJobRequest] Declining job', {jobId, selectedReason});
      await declineJob(jobId, selectedReason);
      navigation.goBack();
    } catch (error) {
      console.error('[NewJobRequest] Failed to decline job', error);
    } finally {
      setIsDeclining(false);
    }
  };

  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <Text style={styles.heading}>New job request</Text>
        <Text style={styles.subheading}>Review and accept if you&apos;re free.</Text>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Vehicle</Text>
          <Text style={styles.value}>{vehicleNumber}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Key tag / Ref</Text>
          <Text style={styles.value}>{tagNumber || '-'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Pickup / Parking point</Text>
          <Text style={styles.value}>{pickupPoint || '-'}</Text>
        </View>

        {showDeclineReasons ? (
          <View style={styles.reasonsBlock}>
            <Text style={styles.reasonsTitle}>Why are you declining?</Text>
            <View style={styles.reasonsList}>
              {DECLINE_REASONS.map(reason => {
                const selected = selectedReason === reason;
                return (
                  <TouchableOpacity
                    key={reason}
                    style={selected ? styles.reasonChipSelected : styles.reasonChip}
                    onPress={() => setSelectedReason(reason)}>
                    <Text
                      style={
                        selected
                          ? styles.reasonChipTextSelected
                          : styles.reasonChipText
                      }>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.declineButton}
            onPress={handleDecline}
            disabled={isAccepting || isDeclining}>
            {isDeclining ? (
              <ActivityIndicator size="small" color="#fecaca" />
            ) : (
              <Text style={styles.declineText}>
                {showDeclineReasons ? 'Confirm decline' : 'Decline'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.acceptButton}
            onPress={handleAccept}
            disabled={isAccepting || isDeclining}>
            {isAccepting ? (
              <ActivityIndicator size="small" color="#f9fafb" />
            ) : (
              <Text style={styles.acceptText}>Accept</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.dismiss}
          onPress={() => navigation.goBack()}
          disabled={isAccepting || isDeclining}>
          <Text style={styles.dismissText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '90%',
    borderRadius: 16,
    backgroundColor: '#020617',
    padding: 20,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f9fafb',
    marginBottom: 4,
  },
  subheading: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: '#9ca3af',
  },
  value: {
    fontSize: 14,
    color: '#e5e7eb',
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  reasonsBlock: {
    marginTop: 16,
    marginBottom: 4,
  },
  reasonsTitle: {
    fontSize: 13,
    color: '#e5e7eb',
    marginBottom: 8,
  },
  reasonsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4b5563',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reasonChipSelected: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#4f46e5',
    borderWidth: 0,
  },
  reasonChipText: {
    color: '#e5e7eb',
    fontSize: 12,
  },
  reasonChipTextSelected: {
    color: '#f9fafb',
    fontSize: 12,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  declineButton: {
    flex: 1,
    marginRight: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4b5563',
    paddingVertical: 10,
    alignItems: 'center',
  },
  declineText: {
    color: '#fecaca',
    fontSize: 14,
    fontWeight: '500',
  },
  acceptButton: {
    flex: 1,
    marginLeft: 8,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#22c55e',
  },
  acceptText: {
    color: '#022c22',
    fontSize: 14,
    fontWeight: '600',
  },
  dismiss: {
    marginTop: 12,
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 12,
    color: '#6b7280',
  },
});
