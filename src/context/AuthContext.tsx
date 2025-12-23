import React, {createContext, ReactNode, useContext, useState, useEffect} from 'react';
import {verifyOtp, loginWithPassword} from '../api/auth';
import {tempLogin, getDriverProfile} from '../api/driver';
import {clearStoredTokens, setStoredTokens, setStoredSession, getStoredSession, clearStoredSession} from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {initializeFCM, clearFCMToken} from '../services/notificationService';

const DRIVER_PROFILE_KEY = 'urbanease.driverProfile';

export type Session = {
  accessToken: string;
  refreshToken?: string;
  driverName: string;
  user?: {
    id: string;
    phone: string;
    role: 'valet' | 'client_admin' | 'super_admin' | 'valet_billing';
  };
};

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  initializing: boolean;
  error: string | null;
  loginWithPhoneOtp: (phone: string, otp: string) => Promise<void>;
  loginWithPasswordAuth: (phone: string, password: string) => Promise<void>;
  loginWithTempToken: (token: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({children}: {children: ReactNode}) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for stored session on mount
  useEffect(() => {
    async function initializeSession() {
      console.log('[Auth] Checking for stored session...');
      try {
        const storedSession = await getStoredSession();
        if (storedSession) {
          console.log('[Auth] Restoring session for:', storedSession.driverName);
          setSession(storedSession);
        } else {
          console.log('[Auth] No valid stored session found');
        }
      } catch (error) {
        console.error('[Auth] Failed to initialize session:', error);
      } finally {
        setInitializing(false);
      }
    }

    initializeSession();
  }, []);

  // Periodically check if session is still valid
  useEffect(() => {
    const checkSessionInterval = setInterval(async () => {
      if (session) {
        const storedSession = await getStoredSession();
        if (!storedSession) {
          console.log('[Auth] Session expired or cleared, logging out');
          setSession(null);
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(checkSessionInterval);
  }, [session]);

  async function loginWithPhoneOtp(phone: string, otp: string) {
    setLoading(true);
    setError(null);
    try {
      console.log('[Auth] Verifying OTP for:', phone);
      const response = await verifyOtp({phone, token: otp});
      await setStoredTokens(response.accessToken, response.refreshToken);

      // Fetch driver profile to get actual name
      let driverName = 'Valet Driver';
      try {
        console.log('[Auth] Fetching driver profile...');
        const profile = await getDriverProfile();
        driverName = profile.name;
        
        // Cache profile in AsyncStorage
        await AsyncStorage.setItem(DRIVER_PROFILE_KEY, JSON.stringify(profile));
        console.log('[Auth] Driver profile cached:', profile.name);
      } catch (profileError) {
        console.error('[Auth] Failed to fetch driver profile:', profileError);
        // Fallback to role-based name
        driverName = response.user.role === 'valet' ? 'Valet Driver' : response.user.role;
      }

      const sessionData = {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        driverName,
        user: response.user,
      };

      // Store session with timestamp for persistence
      await setStoredSession(sessionData);
      setSession(sessionData);

      console.log('[Auth] Session stored, valid for 1 hour');
      
      // Register FCM token with backend after successful login
      try {
        await initializeFCM();
        console.log('[Auth] FCM token registered after login');
      } catch (fcmError) {
        console.error('[Auth] Failed to register FCM token:', fcmError);
        // Don't fail login if FCM registration fails
      }
    } finally {
      setLoading(false);
    }
  }

  async function loginWithPasswordAuth(phone: string, password: string) {
    setLoading(true);
    setError(null);
    try {
      console.log('[Auth] Logging in with password for:', phone);
      const response = await loginWithPassword({phone, password});
      await setStoredTokens(response.accessToken, response.refreshToken);

      // Fetch driver profile to get actual name
      let driverName = 'Billing User';
      try {
        console.log('[Auth] Fetching driver profile...');
        const profile = await getDriverProfile();
        driverName = profile.name;
        
        // Cache profile in AsyncStorage
        await AsyncStorage.setItem(DRIVER_PROFILE_KEY, JSON.stringify(profile));
        console.log('[Auth] Driver profile cached:', profile.name);
      } catch (profileError) {
        console.error('[Auth] Failed to fetch driver profile:', profileError);
        // Fallback to role-based name
        driverName = 'Billing User';
      }

      const sessionData = {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        driverName,
        user: response.user,
      };

      // Store session with timestamp for persistence
      await setStoredSession(sessionData);
      setSession(sessionData);

      console.log('[Auth] Session stored, valid for 1 hour');
      
      // Register FCM token with backend after successful login
      try {
        await initializeFCM();
        console.log('[Auth] FCM token registered after login');
      } catch (fcmError) {
        console.error('[Auth] Failed to register FCM token:', fcmError);
        // Don't fail login if FCM registration fails
      }
    } finally {
      setLoading(false);
    }
  }

  async function loginWithTempToken(token: string): Promise<boolean> {
    setLoading(true);
    setError(null);
    try {
      const response = await tempLogin({code: token});
      
      if (response.ok && response.session) {
        // Store the token (using the code as token for temp access)
        await setStoredTokens(token);
        
        const sessionData = {
          accessToken: token,
          driverName: `Driver ${response.session.driver_id}`,
        };

        // Store session with timestamp for persistence
        await setStoredSession(sessionData);
        setSession(sessionData);

        console.log('[Auth] Temp session stored, valid for 1 hour');
        
        // Register FCM token with backend after successful login
        try {
          await initializeFCM();
          console.log('[Auth] FCM token registered after temp login');
        } catch (fcmError) {
          console.error('[Auth] Failed to register FCM token:', fcmError);
          // Don't fail login if FCM registration fails
        }
        
        return true;
      } else {
        setError('Invalid token. Please check and try again.');
        return false;
      }
    } catch (err: any) {
      console.error('Temp login failed:', err);
      
      // Handle specific error cases
      if (err?.status === 500) {
        setError('Server error. The login service may be temporarily unavailable. Please try again later or contact support.');
      } else if (err?.status === 404) {
        setError('Login endpoint not found. Please contact support.');
      } else if (err?.status === 401 || err?.status === 403) {
        setError('Invalid token. Please check your token and try again.');
      } else if (err?.body?.message) {
        setError(err.body.message);
      } else {
        setError('Login failed. Please check your token and try again.');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    console.log('[Auth] Logging out and clearing stored session');
    setSession(null);
    await clearStoredSession();
    // Clear cached driver profile
    await AsyncStorage.removeItem(DRIVER_PROFILE_KEY);
    console.log('[Auth] Driver profile cache cleared');
    
    // Clear FCM token on logout
    try {
      await clearFCMToken();
      console.log('[Auth] FCM token cleared on logout');
    } catch (fcmError) {
      console.error('[Auth] Failed to clear FCM token:', fcmError);
    }
  }

  function clearError() {
    setError(null);
  }

  return (
    <AuthContext.Provider
      value={{session, loading, initializing, error, loginWithPhoneOtp, loginWithPasswordAuth, loginWithTempToken, logout, clearError}}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
