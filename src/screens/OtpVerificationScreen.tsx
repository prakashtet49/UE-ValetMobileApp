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
  const {phone, password, isPasswordLogin} = route.params;
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error' | 'info'>('info');
  const {loginWithPhoneOtp, loginWithPasswordAuth, loading} = useAuth();

  // Auto-submit for password-based login
  useEffect(() => {
    if (isPasswordLogin && password) {
      // Automatically verify with password
      onVerify();
    }
  }, []);

  // Countdown timer for resend OTP (only for OTP flow)
  useEffect(() => {
    if (!isPasswordLogin && resendTimer > 0) {
      const timer = setTimeout(() => {
        setResendTimer(resendTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (!isPasswordLogin) {
      setCanResend(true);
    }
  }, [resendTimer, isPasswordLogin]);

  const onVerify = async () => {
    // For password-based login (valet_billing), use password
    if (isPasswordLogin && password) {
      await loginWithPasswordAuth(phone, password);
    } else {
      // Normal OTP flow
      if (otp.length !== 4) {
        return;
      }
      await loginWithPhoneOtp(phone, otp);
    }
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
        {isPasswordLogin ? (
          <>
            <Text style={styles.title}>Logging In</Text>
            <Text style={styles.subtitle}>Please wait while we verify your credentials...</Text>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.gradientEnd} />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>Verify OTP</Text>
            <Text style={styles.subtitle}>We sent an OTP to {phone}</Text>

            <TextInput
              style={styles.input}
              placeholder="· · · ·"
              placeholderTextColor="#888"
              keyboardType="number-pad"
              maxLength={7}
              value={otp.split('').join(' ')}
              onChangeText={(text) => setOtp(text.replace(/\s/g, ''))}
              textAlign="center"
              textAlignVertical="center"
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
          </>
        )}
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
    height: Platform.OS === 'ios' ? 72 : 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: Platform.OS === 'ios' ? 20 : 16,
    paddingVertical: Platform.OS === 'ios' ? 18 : 0,
    marginBottom: 16,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
    textAlign: 'center',
    fontSize: Platform.OS === 'ios' ? 34 : 32,
    fontWeight: '600',
    letterSpacing: Platform.OS === 'ios' ? 8 : 6,
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
  loadingContainer: {
    marginTop: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
