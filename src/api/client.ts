import {BASE_URL, ApiException, HttpMethod} from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = 'urbanease.accessToken';
const REFRESH_TOKEN_KEY = 'urbanease.refreshToken';
const SESSION_DATA_KEY = 'urbanease.sessionData';
const SESSION_TIMESTAMP_KEY = 'urbanease.sessionTimestamp';

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export async function setStoredTokens(accessToken: string, refreshToken?: string) {
  await AsyncStorage.multiSet([
    [ACCESS_TOKEN_KEY, accessToken],
    [REFRESH_TOKEN_KEY, refreshToken ?? ''],
  ]);
}

export async function clearStoredTokens() {
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
}

export async function getStoredTokens() {
  const [[, accessToken], [, refreshToken]] = await AsyncStorage.multiGet([
    ACCESS_TOKEN_KEY,
    REFRESH_TOKEN_KEY,
  ]);
  return {accessToken: accessToken || null, refreshToken: refreshToken || null};
}

// Session persistence functions
export async function setStoredSession(sessionData: {
  accessToken: string;
  refreshToken?: string;
  driverName: string;
}) {
  const timestamp = Date.now().toString();
  await AsyncStorage.multiSet([
    [SESSION_DATA_KEY, JSON.stringify(sessionData)],
    [SESSION_TIMESTAMP_KEY, timestamp],
  ]);
}

export async function getStoredSession(): Promise<{
  accessToken: string;
  refreshToken?: string;
  driverName: string;
} | null> {
  try {
    const [[, sessionData], [, timestamp]] = await AsyncStorage.multiGet([
      SESSION_DATA_KEY,
      SESSION_TIMESTAMP_KEY,
    ]);

    if (!sessionData || !timestamp) {
      return null;
    }

    const loginTime = parseInt(timestamp, 10);
    const currentTime = Date.now();
    const elapsed = currentTime - loginTime;

    // Check if session has expired (more than 24 hours)
    if (elapsed > SESSION_DURATION_MS) {
      console.log('[Session] Session expired, clearing stored data');
      await clearStoredSession();
      return null;
    }

    console.log('[Session] Valid session found, expires in:', Math.floor((SESSION_DURATION_MS - elapsed) / 1000 / 60), 'minutes');
    return JSON.parse(sessionData);
  } catch (error) {
    console.error('[Session] Error retrieving stored session:', error);
    return null;
  }
}

export async function clearStoredSession() {
  await AsyncStorage.multiRemove([
    SESSION_DATA_KEY,
    SESSION_TIMESTAMP_KEY,
    ACCESS_TOKEN_KEY,
    REFRESH_TOKEN_KEY,
  ]);
}

/** Update only the access token in stored session (keeps timestamp for 24h window). */
export async function updateStoredSessionAccessToken(accessToken: string) {
  try {
    const [[, sessionData]] = await AsyncStorage.multiGet([SESSION_DATA_KEY]);
    if (!sessionData) return;
    const parsed = JSON.parse(sessionData) as { accessToken?: string; refreshToken?: string; driverName: string; user?: unknown };
    parsed.accessToken = accessToken;
    await AsyncStorage.setItem(SESSION_DATA_KEY, JSON.stringify(parsed));
  } catch (e) {
    console.error('[Session] Error updating session access token:', e);
  }
}

// Callbacks for AuthContext to stay in sync when session is refreshed or invalidated from API layer
let sessionInvalidatedCallback: (() => void) | null = null;
let sessionRefreshedCallback: ((newAccessToken: string) => void) | null = null;

/** In-memory token so the first request after login has the token before AsyncStorage read may see it. */
let currentAccessToken: string | null = null;

export function setCurrentAccessToken(token: string | null) {
  currentAccessToken = token;
}

function getCurrentAccessToken(): string | null {
  return currentAccessToken;
}

export function setSessionInvalidatedCallback(cb: (() => void) | null) {
  sessionInvalidatedCallback = cb;
}

export function setSessionRefreshedCallback(cb: ((newAccessToken: string) => void) | null) {
  sessionRefreshedCallback = cb;
}

/** Call refresh endpoint directly (no auth header) to get new access token. Returns null on failure. */
async function refreshTokens(): Promise<string | null> {
  const {refreshToken} = await getStoredTokens();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({refreshToken}),
    });
    const data = res.ok ? (await res.json()) : undefined;
    if (res.ok && data?.accessToken) return data.accessToken;
    return null;
  } catch (e) {
    console.error('[API] Token refresh failed:', e);
    return null;
  }
}

export type RequestOptions = {
  method?: HttpMethod;
  body?: any;
  auth?: boolean;
  headers?: Record<string, string>;
};

async function doFetch(path: string, options: RequestOptions = {}) {
  const {method = 'GET', body, auth = false, headers = {}} = options;

  const url = `${BASE_URL}${path}`;

  const finalHeaders: Record<string, string> = {
    ...headers,
  };
  
  // Don't set Content-Type for FormData - let the browser set it with boundary
  // For other requests, set Content-Type to application/json
  if (!(body instanceof FormData)) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  let token: string | null = null;
  if (auth) {
    token = getCurrentAccessToken();
    if (!token) {
      const stored = await getStoredTokens();
      token = stored.accessToken;
    }
    if (token) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }
  }

  console.log('[API REQUEST]', {
    url,
    method,
    auth,
    ...(auth && {tokenPresent: !!token}),
    body: body instanceof FormData ? 'FormData' : body,
  });

  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(url, {
      method,
      headers: finalHeaders,
      body: body
        ? body instanceof FormData
          ? body
          : JSON.stringify(body)
        : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const text = await response.text();
    const json = text ? JSON.parse(text) : undefined;

    console.log('[API RESPONSE]', {
      url,
      status: response.status,
      ok: response.ok,
      body: json,
    });

    if (!response.ok) {
      // Handle 401 Unauthorized - try refresh before clearing session
      if (response.status === 401 && auth) {
        const newAccessToken = await refreshTokens();
        if (newAccessToken) {
          const {refreshToken} = await getStoredTokens();
          await setStoredTokens(newAccessToken, refreshToken ?? undefined);
          await updateStoredSessionAccessToken(newAccessToken);
          currentAccessToken = newAccessToken;
          sessionRefreshedCallback?.(newAccessToken);
          console.log('[API] Token refreshed, retrying request');
          return doFetch(path, options);
        }
        console.log('[API] 401 Unauthorized - refresh failed or no refresh token, clearing session');
        await clearStoredSession();
        sessionInvalidatedCallback?.();
        currentAccessToken = null;
      }
      throw new ApiException(response.status, json?.message || 'API error', json);
    }

    return json;
  } catch (error: any) {
    // Provide more helpful error messages
    if (error.name === 'AbortError') {
      console.error('[API ERROR] Request timeout after 30 seconds:', {url, method});
      throw new Error('Request timeout - server is not responding');
    } else if (error.message === 'Network request failed') {
      console.error('[API ERROR] Network request failed:', {url, method});
      throw new Error('Cannot connect to server. Please check your internet connection or try again later.');
    }
    // 4xx (e.g. 404) are often expected for some endpoints; don't log as ERROR
    if (error?.status >= 400 && error?.status < 500) {
      console.log('[API]', error.status, url, error?.message || '');
    } else {
      console.error('[API ERROR]', {url, method, error});
    }
    throw error;
  }
}

export async function apiGet<T>(path: string, auth = false): Promise<T> {
  return doFetch(path, {method: 'GET', auth});
}

export async function apiPost<T>(
  path: string,
  body: any,
  auth = false,
  isFormData = false,
): Promise<T> {
  return doFetch(path, {
    method: 'POST',
    body,
    auth,
    // Don't set Content-Type header for FormData - let browser set it with boundary
    headers: undefined,
  });
}

export async function apiPut<T>(
  path: string,
  body: any,
  auth = false,
): Promise<T> {
  return doFetch(path, {
    method: 'PUT',
    body,
    auth,
  });
}

export async function apiDelete<T>(path: string, auth = false): Promise<T> {
  return doFetch(path, {method: 'DELETE', auth});
}
