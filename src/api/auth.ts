import {apiPost} from './client';

export type SendOtpRequest = {
  phone: string;
};

export type SendOtpResponse = {
  message: string;
  sessionId: string;
};

export type VerifyOtpRequest = {
  phone: string;
  token: string; // 4-digit OTP
};

export type VerifyOtpResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    phone: string;
    role: 'valet' | 'client_admin' | 'super_admin';
  };
};

export type RefreshTokenRequest = {
  refreshToken: string;
};

export type RefreshTokenResponse = {
  accessToken: string;
  expiresIn: number;
};

export async function sendOtp(payload: SendOtpRequest) {
  return apiPost<SendOtpResponse>('/api/v1/auth/send-otp', payload, false);
}

export async function verifyOtp(payload: VerifyOtpRequest) {
  return apiPost<VerifyOtpResponse>('/api/v1/auth/verify-otp', payload, false);
}

export async function refreshAccessToken(payload: RefreshTokenRequest) {
  return apiPost<RefreshTokenResponse>('/auth/refresh-token', payload, false);
}

export async function logoutApi() {
  // Protected endpoint; just POST with no body
  return apiPost<unknown>('/auth/logout', {}, true);
}
