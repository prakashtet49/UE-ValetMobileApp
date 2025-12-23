import React, {useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useNavigation} from '@react-navigation/native';
import type {AppStackParamList} from '../navigation/AppNavigator';
import {getPendingParkingById, startParking} from '../api/parking';

export default function EnterReferenceScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async () => {
    if (!reference.trim()) {
      setError('Please enter the reference number to continue.');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      console.log('[EnterReference] Looking up booking', reference.trim());
      const data = await getPendingParkingById(reference.trim());
      console.log('[EnterReference] Lookup response', data);
      if (!data.requests || !data.requests.length) {
        setError('No pending parking request found for this reference.');
        return;
      }
      const first = data.requests[0];
      try {
        console.log('[EnterReference] Starting parking from reference', {
          bookingId: first.bookingId,
          keyTag: first.keyTag,
        });
        const startResponse = await startParking(first.keyTag);
        console.log('[EnterReference] startParking response', startResponse);
        navigation.navigate('ParkVehicle', {
          parkingJobId: startResponse.parkingJobId,
          keyTagCode: startResponse.keyTagCode,
        } as any);
      } catch (startError) {
        console.error('[EnterReference] Failed to start parking from reference', startError);
        setError('Found the booking but failed to start parking. Please try again.');
      }
    } catch (e) {
      console.error('[EnterReference] Failed to lookup booking', e);
      setError('Could not find booking. Please verify the reference.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.title}>Enter reference number</Text>
        <Text style={styles.subtitle}>
          For WhatsApp-started bookings, enter the reference number shared with
          the guest.
        </Text>

        <Text style={styles.label}>Reference number</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., REF-123456"
          placeholderTextColor="#6b7280"
          autoCapitalize="characters"
          value={reference}
          onChangeText={text => setReference(text.toUpperCase())}
        />

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleLookup}
          disabled={submitting || !reference.trim()}>
          <Text style={styles.primaryButtonText}>
            {submitting ? 'Checking...' : 'Lookup booking'}
          </Text>
        </TouchableOpacity>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050816',
  },
  inner: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 4,
  },
  input: {
    height: Platform.OS === 'ios' ? 52 : 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: Platform.OS === 'ios' ? 16 : 12,
    paddingVertical: Platform.OS === 'ios' ? 14 : 0,
    marginBottom: 16,
    color: '#ffffff',
    backgroundColor: '#09090b',
    fontSize: Platform.OS === 'ios' ? 17 : 16,
  },
  primaryButton: {
    height: Platform.OS === 'ios' ? 52 : 48,
    borderRadius: 8,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: Platform.OS === 'ios' ? 20 : 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    fontWeight: '600',
    letterSpacing: Platform.OS === 'ios' ? -0.4 : 0,
  },
  errorText: {
    marginTop: 12,
    color: '#fecaca',
    fontSize: 13,
  },
});
