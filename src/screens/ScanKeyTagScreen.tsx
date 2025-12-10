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
import {startParking} from '../api/parking';

export default function ScanKeyTagScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [keyTagCode, setKeyTagCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartParking = async () => {
    if (!keyTagCode.trim()) {
      setError('Please enter the key tag code to continue.');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      console.log('[ScanKeyTag] Starting parking for keyTag', keyTagCode.trim());
      const response = await startParking(keyTagCode.trim());
      console.log('[ScanKeyTag] startParking response', response);
      navigation.navigate('ParkVehicle', {
        parkingJobId: response.parkingJobId,
        keyTagCode: response.keyTagCode,
      });
    } catch (e) {
      console.error('[ScanKeyTag] Failed to start parking', e);
      setError('Could not start parking. Please check the key tag.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.title}>Scan or enter key tag</Text>
        <Text style={styles.subtitle}>
          In future this will auto-scan the QR on the key tag. For now, enter
          the key tag code manually.
        </Text>

        <Text style={styles.label}>Key tag code</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., TAG-42"
          placeholderTextColor="#6b7280"
          autoCapitalize="characters"
          value={keyTagCode}
          onChangeText={text => setKeyTagCode(text.toUpperCase())}
        />

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleStartParking}
          disabled={submitting || !keyTagCode.trim()}>
          <Text style={styles.primaryButtonText}>
            {submitting ? 'Starting...' : 'Start parking'}
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
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 12,
    marginBottom: 16,
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
  errorText: {
    marginTop: 12,
    color: '#fecaca',
    fontSize: 13,
  },
});
