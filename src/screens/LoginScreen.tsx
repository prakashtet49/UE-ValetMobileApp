import React, {useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AuthStackParamList} from '../navigation/AppNavigator';
import {sendOtp} from '../api/auth';
import GradientButton from '../components/GradientButton';
import {COLORS, SHADOWS} from '../constants/theme';

export type LoginScreenProps = NativeStackScreenProps<
  AuthStackParamList,
  'Login'
>;

export default function LoginScreen({navigation}: LoginScreenProps) {
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onContinueOtp = async () => {
    const trimmed = phone.trim();
    
    if (!trimmed) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }
    
    if (trimmed.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }
    
    setSubmitting(true);
    try {
      console.log('[LoginScreen] Sending OTP to:', trimmed);
      await sendOtp({phone: trimmed});
      console.log('[LoginScreen] OTP sent successfully');
      navigation.navigate('OtpVerification', {phone: trimmed});
    } catch (error: any) {
      console.error('[LoginScreen] sendOtp failed:', error);
      
      let errorMessage = 'Failed to send OTP. Please try again.';
      
      if (error?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error?.status === 404) {
        errorMessage = 'Service not available. Please contact support.';
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (!error?.status) {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      Alert.alert('Login Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const onTempToken = () => {
    navigation.navigate('TemporaryAccess');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.title}>Driver Login</Text>
        <Text style={styles.subtitle}>
          Login with your phone number or a temporary access token.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Phone number"
          placeholderTextColor="#888"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        <GradientButton
          onPress={onContinueOtp}
          disabled={submitting}
          style={styles.primaryButton}>
          {submitting ? 'Sending OTP...' : 'Continue with OTP'}
        </GradientButton>

        <TouchableOpacity style={styles.secondaryButton} onPress={onTempToken}>
          <Text style={styles.secondaryButtonText}>Login with Temporary Token</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    marginBottom: 16,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
    fontSize: 16,
    ...SHADOWS.small,
  },
  primaryButton: {
    marginBottom: 12,
  },
  secondaryButton: {
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: COLORS.gradientEnd,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: COLORS.white,
  },
  secondaryButtonText: {
    color: COLORS.gradientEnd,
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    alignSelf: 'center',
  },
  linkText: {
    color: COLORS.gradientEnd,
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
  },
});
