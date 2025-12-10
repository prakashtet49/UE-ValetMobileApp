import React, {useState, useEffect} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AuthStackParamList} from '../navigation/AppNavigator';
import {useAuth} from '../context/AuthContext';
import {sendOtp} from '../api/auth';
import Snackbar from '../components/Snackbar';
import GradientButton from '../components/GradientButton';
import {COLORS, SHADOWS} from '../constants/theme';

export type OtpVerificationScreenProps = NativeStackScreenProps<
  AuthStackParamList,
  'OtpVerification'
>;

export default function OtpVerificationScreen({route}: OtpVerificationScreenProps) {
  const {phone} = route.params;
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error' | 'info'>('info');
  const {loginWithPhoneOtp, loading} = useAuth();

  // Countdown timer for resend OTP
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => {
        setResendTimer(resendTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const onVerify = async () => {
    if (otp.length !== 4) {
      return;
    }
    await loginWithPhoneOtp(phone, otp);
  };

  const onResendOtp = async () => {
    if (!canResend || resending) {
      return;
    }

    setResending(true);
    try {
      await sendOtp({phone});
      setSnackbarMessage('OTP sent successfully!');
      setSnackbarType('success');
      setShowSnackbar(true);
      setResendTimer(30);
      setCanResend(false);
      setOtp(''); // Clear previous OTP
    } catch (error) {
      console.error('Resend OTP failed:', error);
      setSnackbarMessage('Failed to send OTP. Please try again.');
      setSnackbarType('error');
      setShowSnackbar(true);
    } finally {
      setResending(false);
    }
  };

  const handleDismissSnackbar = () => {
    setShowSnackbar(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.title}>Verify OTP</Text>
        <Text style={styles.subtitle}>We sent an OTP to {phone}</Text>

        <TextInput
          style={styles.input}
          placeholder="0000"
          placeholderTextColor="#888"
          keyboardType="number-pad"
          maxLength={4}
          value={otp}
          onChangeText={setOtp}
        />

        <GradientButton
          onPress={onVerify}
          disabled={loading}
          style={styles.primaryButton}>
          {loading ? 'Verifying...' : 'Verify'}
        </GradientButton>

        <TouchableOpacity
          style={[styles.linkButton, !canResend && styles.linkButtonDisabled]}
          onPress={onResendOtp}
          disabled={!canResend || resending}>
          {resending ? (
            <ActivityIndicator size="small" color="#a5b4fc" />
          ) : (
            <Text style={[styles.linkText, !canResend && styles.linkTextDisabled]}>
              {canResend ? 'Resend OTP' : `Resend OTP in ${resendTimer}s`}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <Snackbar
        visible={showSnackbar}
        message={snackbarMessage}
        type={snackbarType}
        onDismiss={handleDismissSnackbar}
      />
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
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    marginBottom: 16,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
    textAlign: 'center',
    letterSpacing: 12,
    fontSize: 24,
    fontWeight: '600',
    ...SHADOWS.small,
  },
  primaryButton: {
    marginBottom: 12,
  },
  linkButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  linkButtonDisabled: {
    opacity: 0.5,
  },
  linkText: {
    color: COLORS.gradientEnd,
    fontSize: 15,
    marginTop: 8,
    fontWeight: '500',
  },
  linkTextDisabled: {
    color: COLORS.textLight,
  },
});
