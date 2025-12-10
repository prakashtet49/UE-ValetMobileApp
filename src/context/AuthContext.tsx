import React, {createContext, ReactNode, useContext, useState} from 'react';
import {verifyOtp} from '../api/auth';
import {tempLogin} from '../api/driver';
import {clearStoredTokens, setStoredTokens} from '../api/client';

export type Session = {
  accessToken: string;
  refreshToken?: string;
  driverName: string;
};

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  error: string | null;
  loginWithPhoneOtp: (phone: string, otp: string) => Promise<void>;
  loginWithTempToken: (token: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({children}: {children: ReactNode}) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loginWithPhoneOtp(phone: string, otp: string) {
    setLoading(true);
    try {
      const response = await verifyOtp({phone, token: otp});
      await setStoredTokens(response.accessToken, response.refreshToken);

      const driverName =
        response.user.role === 'valet' ? 'Valet Driver' : response.user.role;

      setSession({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        driverName,
      });
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
        
        setSession({
          accessToken: token,
          driverName: `Driver ${response.session.driver_id}`,
        });
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
    setSession(null);
    await clearStoredTokens();
  }

  function clearError() {
    setError(null);
  }

  return (
    <AuthContext.Provider
      value={{session, loading, error, loginWithPhoneOtp, loginWithTempToken, logout, clearError}}>
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
