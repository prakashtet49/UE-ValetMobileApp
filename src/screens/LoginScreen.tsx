import React, {useState} from 'react';
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
import {sendOtp} from '../api/auth';
import {useAuth} from '../context/AuthContext';
import GradientButton from '../components/GradientButton';
import CustomDialog from '../components/CustomDialog';
import {COLORS, SHADOWS} from '../constants/theme';

export type LoginScreenProps = NativeStackScreenProps<
  AuthStackParamList,
  'Login'
>;

export default function LoginScreen({navigation}: LoginScreenProps) {
  const {loginWithPasswordAuth, loginWithPhoneOtp} = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [showOtpField, setShowOtpField] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: Array<{text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive'}>;
  }>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });

  const onContinueOtp = async () => {
    const trimmed = phone.trim();
    
    if (!trimmed) {
      setDialog({
        visible: true,
        title: 'Error',
        message: 'Please enter your phone number',
        buttons: [{text: 'OK', style: 'default'}],
      });
      return;
    }
    
    if (trimmed.length < 10) {
      setDialog({
        visible: true,
        title: 'Error',
        message: 'Please enter a valid phone number',
        buttons: [{text: 'OK', style: 'default'}],
      });
      return;
    }
    
    setSubmitting(true);
    try {
      console.log('[LoginScreen] Sending OTP to:', trimmed);
      const response = await sendOtp({phone: trimmed});
      console.log('[LoginScreen] OTP sent successfully, role:', response.role);
      
      // Check if role is valet_billing - show password field, otherwise show OTP field
      if (response.role === 'valet_billing') {
        console.log('[LoginScreen] Valet billing role detected, showing password field');
        setUserRole(response.role);
        setShowPasswordField(true);
      } else {
        // Normal OTP flow for other roles - show OTP field on same screen
        console.log('[LoginScreen] OTP sent, showing OTP field');
        setShowOtpField(true);
      }
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
      
      setDialog({
        visible: true,
        title: 'Login Error',
        message: errorMessage,
        buttons: [{text: 'OK', style: 'default'}],
      });
    } finally {
      setSubmitting(false);
    }
  };

  const onVerifyOtp = async () => {
    const trimmedOtp = otp.trim();
    
    if (!trimmedOtp) {
      setDialog({
        visible: true,
        title: 'Error',
        message: 'Please enter the OTP',
        buttons: [{text: 'OK', style: 'default'}],
      });
      return;
    }
    
    if (trimmedOtp.length !== 4) {
      setDialog({
        visible: true,
        title: 'Error',
        message: 'Please enter a valid 4-digit OTP',
        buttons: [{text: 'OK', style: 'default'}],
      });
      return;
    }
    
    setSubmitting(true);
    try {
      console.log('[LoginScreen] Verifying OTP');
      // Call loginWithPhoneOtp directly - no navigation
      await loginWithPhoneOtp(phone.trim(), trimmedOtp);
      // On success, user will be automatically navigated to appropriate screen by AppNavigator
    } catch (error: any) {
      console.error('[LoginScreen] OTP verification failed:', error);
      setDialog({
        visible: true,
        title: 'Login Error',
        message: error?.message || 'Invalid OTP. Please try again.',
        buttons: [{text: 'OK', style: 'default'}],
      });
      setSubmitting(false);
    }
  };

  const onLoginWithPassword = async () => {
    const trimmedPassword = password.trim();
    
    if (!trimmedPassword) {
      setDialog({
        visible: true,
        title: 'Error',
        message: 'Please enter your password',
        buttons: [{text: 'OK', style: 'default'}],
      });
      return;
    }
    
    setSubmitting(true);
    try {
      console.log('[LoginScreen] Logging in with password for valet_billing');
      // Call loginWithPasswordAuth directly - no navigation
      await loginWithPasswordAuth(phone.trim(), trimmedPassword);
      // On success, user will be automatically navigated to BillingScreen by AppNavigator
    } catch (error: any) {
      console.error('[LoginScreen] Password login failed:', error);
      setDialog({
        visible: true,
        title: 'Login Error',
        message: error?.message || 'Failed to login. Please try again.',
        buttons: [{text: 'OK', style: 'default'}],
      });
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
          style={[styles.input, (showPasswordField || showOtpField) && styles.inputDisabled]}
          placeholder="Phone number"
          placeholderTextColor="#888"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          editable={!showPasswordField && !showOtpField}
        />

        {showOtpField && (
          <TextInput
            style={styles.input}
            placeholder="Enter 4-digit OTP"
            placeholderTextColor="#888"
            keyboardType="number-pad"
            maxLength={4}
            value={otp}
            onChangeText={setOtp}
            autoFocus
          />
        )}

        {showPasswordField && (
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#888"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            autoFocus
          />
        )}

        {!showPasswordField && !showOtpField ? (
          <>
            <GradientButton
              onPress={onContinueOtp}
              disabled={submitting}
              style={styles.primaryButton}>
              {submitting ? 'Authenticating...' : 'Continue with OTP'}
            </GradientButton>

            <TouchableOpacity style={styles.secondaryButton} onPress={onTempToken}>
              <Text style={styles.secondaryButtonText}>Login with Temporary Token</Text>
            </TouchableOpacity>
          </>
        ) : showOtpField ? (
          <>
            <GradientButton
              onPress={onVerifyOtp}
              disabled={submitting}
              style={styles.primaryButton}>
              {submitting ? 'Verifying...' : 'Verify OTP'}
            </GradientButton>
            
            {submitting && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.gradientEnd} />
                <Text style={styles.loadingText}>Please wait...</Text>
              </View>
            )}
          </>
        ) : (
          <>
            <GradientButton
              onPress={onLoginWithPassword}
              disabled={submitting}
              style={styles.primaryButton}>
              {submitting ? 'Authenticating...' : 'Login'}
            </GradientButton>
            
            {submitting && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.gradientEnd} />
                <Text style={styles.loadingText}>Please wait...</Text>
              </View>
            )}
          </>
        )}

        {/* Custom Dialog */}
        <CustomDialog
          visible={dialog.visible}
          title={dialog.title}
          message={dialog.message}
          buttons={dialog.buttons}
          onDismiss={() => setDialog({...dialog, visible: false})}
        />
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
    height: Platform.OS === 'ios' ? 56 : 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: Platform.OS === 'ios' ? 18 : 16,
    paddingVertical: Platform.OS === 'ios' ? 16 : 0,
    marginBottom: 16,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    ...SHADOWS.small,
  },
  primaryButton: {
    marginBottom: 12,
  },
  secondaryButton: {
    height: Platform.OS === 'ios' ? 56 : 52,
    borderRadius: Platform.OS === 'ios' ? 28 : 26,
    borderWidth: 2,
    borderColor: COLORS.gradientEnd,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: COLORS.white,
    paddingHorizontal: Platform.OS === 'ios' ? 24 : 20,
  },
  secondaryButtonText: {
    color: COLORS.gradientEnd,
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    fontWeight: '600',
    letterSpacing: Platform.OS === 'ios' ? -0.4 : 0,
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
  inputDisabled: {
    backgroundColor: COLORS.backgroundLight,
    color: COLORS.textSecondary,
  },
  loadingContainer: {
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
