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
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AuthStackParamList} from '../navigation/AppNavigator';
import {useAuth} from '../context/AuthContext';
import Snackbar from '../components/Snackbar';
import GradientButton from '../components/GradientButton';
import {COLORS, SHADOWS} from '../constants/theme';

export type TemporaryAccessScreenProps = NativeStackScreenProps<
  AuthStackParamList,
  'TemporaryAccess'
>;

export default function TemporaryAccessScreen({navigation}: TemporaryAccessScreenProps) {
  const [token, setToken] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);
  const {loginWithTempToken, loading, error, clearError} = useAuth();

  const onSubmit = async () => {
    if (!token.trim()) {
      return;
    }
    const success = await loginWithTempToken(token.trim());
    if (!success) {
      setShowSnackbar(true);
    }
  };

  const handleDismissSnackbar = () => {
    setShowSnackbar(false);
    clearError();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.title}>Temporary Access</Text>
        <Text style={styles.subtitle}>
          Enter or scan your temporary driver token to access the app.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Temporary token"
          placeholderTextColor="#888"
          autoCapitalize="none"
          value={token}
          onChangeText={setToken}
        />

        <GradientButton
          onPress={onSubmit}
          disabled={loading}
          style={styles.primaryButton}>
          {loading ? 'Verifying...' : 'Login with Token'}
        </GradientButton>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>

      <Snackbar
        visible={showSnackbar}
        message={error || 'Login failed'}
        type="error"
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
    backgroundColor: COLORS.white,
  },
  secondaryButtonText: {
    color: COLORS.gradientEnd,
    fontSize: 16,
    fontWeight: '600',
  },
});
