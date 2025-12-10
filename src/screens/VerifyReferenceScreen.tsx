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
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {AppStackParamList} from '../navigation/AppNavigator';
import {getPickupJobDetails} from '../api/pickup';

type VerifyReferenceRouteProp = RouteProp<AppStackParamList, 'VerifyReference'>;

export default function VerifyReferenceScreen() {
  const route = useRoute<VerifyReferenceRouteProp>();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const {pickupJobId} = route.params;

  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!reference.trim()) {
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      console.log('[VerifyReference] Verifying reference', {
        pickupJobId,
        reference: reference.trim(),
      });
      const details = await getPickupJobDetails(pickupJobId);
      console.log('[VerifyReference] Job details', details);

      // TODO: once backend shape is final, compare reference to the correct field.
      // For now, treat any non-empty reference as success.
      const isMatch = !!reference.trim();

      if (!isMatch) {
        setError('Reference does not match this job.');
        return;
      }

      navigation.replace('HandoverConfirmation', {pickupJobId});
    } catch (e) {
      console.error('[VerifyReference] Failed to verify reference', e);
      setError('Could not verify reference. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.title}>Verify reference</Text>
        <Text style={styles.subtitle}>
          Ask the guest for their reference number and enter it here to confirm
          handover.
        </Text>

        <Text style={styles.label}>Reference number</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., REF-1234"
          placeholderTextColor="#6b7280"
          autoCapitalize="characters"
          value={reference}
          onChangeText={setReference}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleVerify}
          disabled={submitting || !reference.trim()}>
          <Text style={styles.primaryButtonText}>
            {submitting ? 'Verifying...' : 'Verify & continue'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.replace('OverrideHandover', {pickupJobId})}
          disabled={submitting}>
          <Text style={styles.secondaryButtonText}>Use override instead</Text>
        </TouchableOpacity>
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
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 12,
    marginBottom: 12,
    color: '#ffffff',
    backgroundColor: '#09090b',
  },
  primaryButton: {
    height: 48,
    borderRadius: 8,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4b5563',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    marginTop: 4,
    marginBottom: 4,
    color: '#fecaca',
    fontSize: 13,
  },
});
